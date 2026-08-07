import { Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  FlipType,
  SaveFormat,
  manipulateAsync,
} from 'expo-image-manipulator';

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  /** Original file name when the picker provides one. */
  fileName?: string;
};

const pickOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
  exif: false,
};

function fromAsset(asset: ImagePicker.ImagePickerAsset): PickedImage {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName ?? undefined,
  };
}

/**
 * Web file picker that resolves on cancel.
 * expo-image-picker’s web input never settles when the dialog is dismissed in
 * browsers that don’t fire the `cancel` event (e.g. Safari) — busy UI sticks.
 */
function pickImageFileWeb(): Promise<PickedImage | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const done = (file: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      const uri = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.onload = () => {
        resolve({
          uri,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          fileName: file.name,
        });
      };
      img.onerror = () => {
        resolve({
          uri,
          width: 0,
          height: 0,
          fileName: file.name,
        });
      };
      img.src = uri;
    };

    const onFocus = () => {
      // Dialog closed; prefer change/cancel when they fire. If not, settle from files.
      window.setTimeout(() => {
        if (settled) return;
        done(input.files?.[0] ?? null);
      }, 500);
    };

    input.addEventListener('change', () => {
      done(input.files?.[0] ?? null);
    });
    input.addEventListener('cancel', () => done(null));

    // Defer so the opening click doesn’t count as focus-return.
    window.setTimeout(() => {
      if (!settled) window.addEventListener('focus', onFocus);
    }, 300);

    input.click();
  });
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    return pickImageFileWeb();
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync(pickOptions);
  if (result.canceled || !result.assets[0]) return null;
  return fromAsset(result.assets[0]);
}

/** System / browser camera. Pass cameraType for front/back (passport → front). */
export async function pickFromCamera(
  cameraType: ImagePicker.CameraType = ImagePicker.CameraType.front,
): Promise<PickedImage | null> {
  // Web: use live getUserMedia via `/camera` — file-input "capture" is a picker.
  if (Platform.OS === 'web') {
    return null;
  }

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    ...pickOptions,
    cameraType,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    ...fromAsset(asset),
    fileName:
      asset.fileName ??
      `camera-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`,
  };
}

export async function rotateImage(uri: string, degrees: number): Promise<string> {
  const result = await manipulateAsync(uri, [{ rotate: degrees }], {
    compress: 1,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

export async function flipHorizontal(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ flip: FlipType.Horizontal }],
    { compress: 1, format: SaveFormat.JPEG },
  );
  return result.uri;
}

/** Cap very large sources for memory while keeping print headroom. */
export async function maybeDownscale(
  uri: string,
  width: number,
  height: number,
  maxEdge = 4096,
): Promise<string> {
  const long = Math.max(width, height);
  if (long <= maxEdge) return uri;
  const scale = maxEdge / long;
  const result = await manipulateAsync(
    uri,
    [
      {
        resize: {
          width: Math.round(width * scale),
          height: Math.round(height * scale),
        },
      },
    ],
    { compress: 0.95, format: SaveFormat.JPEG },
  );
  return result.uri;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

/**
 * Downscale huge camera/library picks before session storage.
 * Keeps crop math on the (possibly resized) URI; export uses the same file.
 */
export async function preparePersonImage(
  img: PickedImage,
  maxEdge = 4096,
): Promise<PickedImage> {
  let { uri, width, height } = img;
  if (!width || !height) {
    try {
      const size = await getImageSize(uri);
      width = size.width;
      height = size.height;
    } catch {
      return img;
    }
  }
  const nextUri = await maybeDownscale(uri, width, height, maxEdge);
  if (nextUri === uri) return { ...img, width, height };
  const long = Math.max(width, height);
  const scale = maxEdge / long;
  return {
    ...img,
    uri: nextUri,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

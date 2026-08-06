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

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync(pickOptions);
  if (result.canceled || !result.assets[0]) return null;
  return fromAsset(result.assets[0]);
}

/** Fallback camera via system picker (works in Expo Go / web). */
export async function pickFromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync(pickOptions);
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

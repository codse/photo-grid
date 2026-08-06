import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AdjustedCropImage } from '@/features/sheet/adjusted-crop-image';
import type { Adjustments, CropState } from '@/core/types';
import { colors } from '@/ui/tokens';

type Props = {
  uri: string;
  imgW: number;
  imgH: number;
  width: number;
  height: number;
  crop: CropState;
  adjust?: Adjustments;
  style?: StyleProp<ViewStyle>;
};

/** Clipped cell that mirrors export crop (pan/zoom) + tone adjustments. */
export function CroppedImagePreview({
  uri,
  imgW,
  imgH,
  width,
  height,
  crop,
  adjust,
  style,
}: Props) {
  return (
    <View
      style={[
        { width, height, overflow: 'hidden', backgroundColor: colors.line },
        style,
      ]}
    >
      <AdjustedCropImage
        uri={uri}
        imgW={imgW}
        imgH={imgH}
        frameW={width}
        frameH={height}
        crop={crop}
        adjust={adjust}
      />
    </View>
  );
}

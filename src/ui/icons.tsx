import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/ui/tokens';

type IconProps = {
  size?: number;
  color?: string;
};

export function CameraIcon({ size = 28, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6A1.5 1.5 0 0 1 10 3.8h4a1.5 1.5 0 0 1 1.2.6L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12.5} r={3.25} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

export function LibraryIcon({ size = 28, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4}
        y={5}
        width={12}
        height={14}
        rx={2}
        stroke={color}
        strokeWidth={1.75}
      />
      <Path
        d="M9 5V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-1"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GridIcon({ size = 28, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.75} />
      <Rect x={13} y={4} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.75} />
      <Rect x={4} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.75} />
      <Rect x={13} y={13} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

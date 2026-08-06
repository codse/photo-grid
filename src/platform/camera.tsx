/**
 * TypeScript / fallback entry.
 * Metro on iOS/Android prefers `camera.native.tsx` over this file
 * (unlike a `.ts` stub, which was winning the `.ts` pass and shipping web UI).
 */
export { CameraCapture } from './camera.web';
export type { CameraCaptureProps } from './camera-types';

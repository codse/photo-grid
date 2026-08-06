export type CameraCaptureProps = {
  onCaptured: (result: { uri: string; sourceName?: string }) => void;
  onCancel: () => void;
};

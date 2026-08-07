/** Drop a baked preview blob URL (web). */
export function releasePreviewUri(uri: string | undefined | null): void {
  if (!uri) return;
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      // ignore
    }
  }
}

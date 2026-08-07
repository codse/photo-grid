import * as FileSystem from 'expo-file-system/legacy';

/** Delete a baked preview JPEG from cache (native). */
export function releasePreviewUri(uri: string | undefined | null): void {
  if (!uri) return;
  // Only touch files we created — never the source photo.
  if (!uri.includes('person-preview-')) return;
  void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {
    // ignore
  });
}

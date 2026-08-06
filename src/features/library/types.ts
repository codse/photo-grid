export type SavedSheet = {
  id: string;
  createdAt: number;
  title: string;
  paperLabel: string;
  photoSummary: string;
  cellCount: number;
  /** Local file URI (native) or idb-backed object URL key (web). */
  uri: string;
};

export type SaveSheetInput = {
  title?: string;
  paperLabel: string;
  photoSummary: string;
  cellCount: number;
  /** PNG bytes as base64 (no data: prefix). */
  pngBase64: string;
};

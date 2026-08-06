import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@/platform/storage';
import type { SavedSheet, SaveSheetInput } from '@/features/library/types';
import { uid } from '@/core/types';

export const SAVED_SHEETS_AVAILABLE = true;

const INDEX_KEY = 'passport-photo-print.saved-sheets.v1';
const ROOT = `${FileSystem.documentDirectory}passport-photo-print/sheets/`;

async function ensureRoot() {
  const info = await FileSystem.getInfoAsync(ROOT);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
  }
}

async function readIndex(): Promise<SavedSheet[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSheet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(items: SavedSheet[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(items));
}

export async function listSavedSheets(): Promise<SavedSheet[]> {
  return readIndex();
}

export async function saveSheet(input: SaveSheetInput): Promise<SavedSheet> {
  await ensureRoot();
  const id = uid('sheet');
  const path = `${ROOT}${id}.png`;
  await FileSystem.writeAsStringAsync(path, input.pngBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const meta: SavedSheet = {
    id,
    createdAt: Date.now(),
    title: input.title ?? `Sheet ${new Date().toLocaleDateString()}`,
    paperLabel: input.paperLabel,
    photoSummary: input.photoSummary,
    cellCount: input.cellCount,
    uri: path,
  };
  const index = await readIndex();
  await writeIndex([meta, ...index].slice(0, 50));
  return meta;
}

export async function getSheetDataUrl(uri: string): Promise<string | null> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return null;
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/png;base64,${b64}`;
}

export async function deleteSavedSheet(id: string): Promise<void> {
  const index = await readIndex();
  const item = index.find((s) => s.id === id);
  if (item) {
    try {
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
    } catch {
      // ignore
    }
  }
  await writeIndex(index.filter((s) => s.id !== id));
}

export async function shareSavedSheet(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Share saved sheet',
    });
  }
}

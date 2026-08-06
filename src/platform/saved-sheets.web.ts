/**
 * Web stub — Saved sheets / local archive is native-only.
 * Sharing/download still works via browser download.
 */
import type { SavedSheet, SaveSheetInput } from '@/features/library/types';

export const SAVED_SHEETS_AVAILABLE = false;

export async function listSavedSheets(): Promise<SavedSheet[]> {
  return [];
}

export async function saveSheet(_input: SaveSheetInput): Promise<SavedSheet> {
  throw new Error('Saved sheets are available in the iOS/Android app.');
}

export async function getSheetDataUrl(_uri: string): Promise<string | null> {
  return null;
}

export async function deleteSavedSheet(_id: string): Promise<void> {
  // no-op
}

export async function shareSavedSheet(_uri: string): Promise<void> {
  throw new Error('Saved sheets are available in the iOS/Android app.');
}

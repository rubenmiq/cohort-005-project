import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type SavedNote = { body: string; updatedAt: string } | null;

export type NoteDraftState = {
  length: number;
  tooLong: boolean;
  empty: boolean;
  unsaved: boolean;
  canSave: boolean;
};

/**
 * What the Lesson Note editor shows for the text in the box: its length
 * against the limit, whether it differs from the saved Note, and whether
 * Save should be enabled.
 */
export function describeNoteDraft(
  draft: string,
  saved: SavedNote,
  maxLength: number = MAX_NOTE_LENGTH
): NoteDraftState {
  const trimmed = draft.trim();
  const length = trimmed.length;
  const tooLong = trimmed.length > maxLength;
  const empty = trimmed.length === 0;
  // The server trims before it stores, so whitespace at either end is not a change.
  const unsaved = trimmed !== (saved?.body ?? "");

  return {
    length,
    tooLong,
    empty,
    unsaved,
    canSave: unsaved && !empty && !tooLong,
  };
}

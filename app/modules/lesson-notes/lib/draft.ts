export type SavedNote = { body: string; updatedAt: string } | null;

export type NoteDraftState = {
  length: number;
  tooLong: boolean;
  empty: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function describeDraft(
  draft: string,
  saved: SavedNote,
  maxLength: number
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

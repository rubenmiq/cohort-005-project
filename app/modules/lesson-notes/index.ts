import { MAX_NOTE_LENGTH } from "~/lib/notes";
import {
  describeDraft,
  type NoteDraftState,
  type SavedNote,
} from "./lib/draft";

export type { NoteDraftState, SavedNote };

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
  return describeDraft(draft, saved, maxLength);
}

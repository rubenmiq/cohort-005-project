import { describe, it, expect } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

const saved = {
  body: "Generics are type parameters.",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

describe("describeNoteDraft", () => {
  it("treats an empty box with no saved Note as empty and not saveable", () => {
    expect(describeNoteDraft("", null)).toEqual({
      length: 0,
      tooLong: false,
      empty: true,
      unsaved: false,
      canSave: false,
    });
  });

  it("treats a whitespace-only box as empty", () => {
    const state = describeNoteDraft("   \n ", null);
    expect(state.empty).toBe(true);
    expect(state.canSave).toBe(false);
  });

  it("lets a new Note be saved", () => {
    const state = describeNoteDraft("First thought", null);
    expect(state).toMatchObject({ length: 13, unsaved: true, canSave: true });
  });

  it("sees no change when the box matches the saved Note", () => {
    const state = describeNoteDraft(saved.body, saved);
    expect(state.unsaved).toBe(false);
    expect(state.canSave).toBe(false);
  });

  it("ignores surrounding whitespace, which the server trims away", () => {
    expect(describeNoteDraft(`  ${saved.body}\n`, saved).unsaved).toBe(false);
  });

  it("sees an edit to the saved Note as unsaved", () => {
    const state = describeNoteDraft(`${saved.body} And constraints.`, saved);
    expect(state.unsaved).toBe(true);
    expect(state.canSave).toBe(true);
  });

  it("allows a Note exactly at the limit", () => {
    const state = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null);
    expect(state.tooLong).toBe(false);
    expect(state.canSave).toBe(true);
  });

  it("refuses a Note over the limit", () => {
    const state = describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null);
    expect(state.tooLong).toBe(true);
    expect(state.canSave).toBe(false);
  });

  it("takes the limit as an argument", () => {
    expect(describeNoteDraft("abcd", null, 3).tooLong).toBe(true);
    expect(describeNoteDraft("abc", null, 3).tooLong).toBe(false);
  });

  it("counts the characters that will be saved", () => {
    expect(describeNoteDraft(" ab ", null).length).toBe(2);
  });
});

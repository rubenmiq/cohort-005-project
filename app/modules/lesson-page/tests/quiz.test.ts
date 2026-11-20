import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";

// The module reads through the app's shared `db`; point it at a fresh
// in-memory database for each test.
let testDb: TestDb;
vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

const { getQuizById } = await import("../quiz.server");

function addLessonWithQuiz(title: string) {
  const mod = testDb
    .insert(schema.modules)
    .values({ courseId, title: `${title} module`, position: 1 })
    .returning()
    .get();
  const lesson = testDb
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title, position: 1 })
    .returning()
    .get();
  return testDb
    .insert(schema.quizzes)
    .values({ lessonId: lesson.id, title: `${title} quiz`, passingScore: 0.7 })
    .returning()
    .get();
}

let courseId: number;

beforeEach(() => {
  testDb = createTestDb();
  courseId = seedBaseData(testDb).course.id;
});

describe("getQuizById", () => {
  it("returns the quiz with that id, not another one", () => {
    const first = addLessonWithQuiz("First");
    const second = addLessonWithQuiz("Second");

    expect(getQuizById(second.id)).toEqual(second);
    expect(getQuizById(first.id)).toEqual(first);
  });

  it("returns undefined for an id with no quiz", () => {
    addLessonWithQuiz("Only");

    expect(getQuizById(9999)).toBeUndefined();
  });
});

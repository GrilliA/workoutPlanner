import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Exercise, LoggedSet } from "../../api/schemas";
import {
  decodeSessionBundle,
  encodeSessionBundle,
  type SessionBundle,
} from "./sessionBundleCodec";

const loggedSet = (overrides: Partial<LoggedSet>): LoggedSet => ({
  id: 1,
  sessionId: 7,
  exerciseId: 10,
  setNumber: 1,
  weightKg: 60,
  reps: 8,
  rir: null,
  tutSec: null,
  loggedAt: new Date("2026-10-14T08:10:00.000Z"),
  ...overrides,
});

const exercise: Exercise = {
  id: 10,
  name: "Panca piana",
  sets: 3,
  reps: 8,
  workoutId: 3,
  workoutDayId: 4,
  imageUrl: null,
  setPrescriptions: [{ setNumber: 1, reps: 8, restSec: 90 }],
};

const bundle = (): SessionBundle => ({
  session: {
    id: 7,
    workoutId: 3,
    workoutDayId: 4,
    userId: 2,
    status: "in_progress",
    startedAt: new Date("2026-10-14T08:00:00.000Z"),
    completedAt: null,
    notes: null,
    sets: [loggedSet({})],
  },
  workoutName: "Scheda A",
  defaultRestSec: 90,
  exercises: [exercise],
  previousByExercise: new Map([
    [
      10,
      [
        loggedSet({ id: 2, sessionId: 5, setNumber: 1 }),
        loggedSet({ id: 3, sessionId: 5, setNumber: 2 }),
      ],
    ],
  ]),
});

describe("sessionBundleCodec", () => {
  it("reads back what it wrote, dates and previous sets included", () => {
    const decoded = decodeSessionBundle(encodeSessionBundle(bundle()), 7);

    assert.deepEqual(decoded, bundle());
  });

  it("ignores a bundle saved for another session", () => {
    assert.equal(decodeSessionBundle(encodeSessionBundle(bundle()), 8), null);
  });

  it("ignores a half-written or foreign file", () => {
    const text = encodeSessionBundle(bundle());

    assert.equal(decodeSessionBundle(text.slice(0, text.length / 2), 7), null);
    assert.equal(decodeSessionBundle(JSON.stringify({ session: 7 }), 7), null);
  });
});

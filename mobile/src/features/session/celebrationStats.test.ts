import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LoggedSet } from "../../api";
import {
  computeDurationMin,
  computeVolumeKg,
  formatDurationLabel,
  formatVolumeLabel,
} from "./celebrationStats";

const set = (partial: Partial<LoggedSet> & Pick<LoggedSet, "reps">): LoggedSet => ({
  id: 1,
  sessionId: 1,
  exerciseId: 1,
  setNumber: 1,
  weightKg: null,
  rir: null,
  tutSec: null,
  loggedAt: new Date(),
  ...partial,
});

describe("computeVolumeKg", () => {
  it("sums weight * reps and ignores null/zero weight", () => {
    assert.equal(
      computeVolumeKg([
        set({ weightKg: 100, reps: 5 }),
        set({ weightKg: null, reps: 10 }),
        set({ weightKg: 0, reps: 8 }),
        set({ weightKg: 50, reps: 2 }),
      ]),
      600,
    );
  });
});

describe("computeDurationMin", () => {
  it("returns 0 when completed before or at start", () => {
    const start = new Date("2026-07-24T10:00:00Z");
    assert.equal(computeDurationMin(start, start), 0);
    assert.equal(
      computeDurationMin(start, new Date("2026-07-24T09:59:00Z")),
      0,
    );
  });

  it("rounds to at least 1 minute when elapsed", () => {
    const start = new Date("2026-07-24T10:00:00Z");
    assert.equal(
      computeDurationMin(start, new Date("2026-07-24T10:00:20Z")),
      1,
    );
    assert.equal(
      computeDurationMin(start, new Date("2026-07-24T10:45:00Z")),
      45,
    );
  });
});

describe("format labels", () => {
  it("formats volume and duration", () => {
    assert.equal(formatVolumeLabel(0), "0 kg");
    assert.equal(formatVolumeLabel(850), "850 kg");
    assert.equal(formatVolumeLabel(1250), "1.3k kg");
    assert.equal(formatDurationLabel(0), "—");
    assert.equal(formatDurationLabel(12), "12 min");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adherenceRange, adherenceView } from "./adherence.ts";

const day = (date: string, counts: Partial<Record<"mealCount" | "doneCount" | "otherCount" | "removedCount", number>>) => ({
  date,
  mealCount: 4,
  doneCount: 0,
  otherCount: 0,
  removedCount: 0,
  ...counts,
});

describe("adherenceRange", () => {
  it("covers seven days ending today, across a month", () => {
    assert.deepEqual(adherenceRange("2026-12-03"), { from: "2026-11-27", to: "2026-12-03" });
  });
});

describe("adherenceView", () => {
  it("counts done meals over planned meals and marks today", () => {
    const view = adherenceView(
      [
        day("2026-11-22", { doneCount: 4 }),
        day("2026-11-23", { doneCount: 1, otherCount: 2, removedCount: 2 }),
      ],
      "2026-11-23",
    );

    assert.equal(view.percent, 63);
    assert.equal(view.removedCount, 2);
    assert.deepEqual(
      view.days.map((entry) => [entry.weekdayLabel, entry.isToday, entry.donePercent, entry.otherPercent]),
      [
        ["Dom", false, 100, 0],
        ["Lun", true, 25, 50],
      ],
    );
    assert.equal(view.days[1].description, "Lun, oggi: fatti 1, altro 2, pasti nel piano 4");
  });

  it("never lets done and other pass the whole day, whatever the rounding", () => {
    // 1 of 8 rounds up to 13 and 7 of 8 rounds up to 88: 101 together.
    const view = adherenceView([day("2026-11-23", { mealCount: 8, doneCount: 1, otherCount: 7 })], "2026-11-23");

    assert.equal(view.days[0].donePercent, 13);
    assert.equal(view.days[0].otherPercent, 87);
  });

  it("has no percentage when no meal was planned", () => {
    const view = adherenceView([day("2026-11-23", { mealCount: 0, removedCount: 1 })], "2026-11-23");

    assert.equal(view.percent, null);
    assert.equal(view.days[0].donePercent, 0);
    assert.equal(view.days[0].otherPercent, 0);
    assert.equal(view.removedCount, 1);
  });
});

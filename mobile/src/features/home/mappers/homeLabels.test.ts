import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGreeting,
  formatInitials,
  formatLastSession,
  formatLongDate,
  formatNextWorkout,
  formatSessionsLast7Days,
} from "./homeLabels";
import { mapHomeWeek } from "./mapWeekStrip";

describe("formatGreeting", () => {
  it("uses the first name only", () => {
    assert.equal(formatGreeting("Marco Bianchi"), "Ciao, Marco");
  });

  it("says just Ciao without a name", () => {
    assert.equal(formatGreeting(null), "Ciao");
    assert.equal(formatGreeting("  "), "Ciao");
  });
});

describe("formatInitials", () => {
  it("takes up to two initials", () => {
    assert.equal(formatInitials("marco bianchi rossi"), "MB");
    assert.equal(formatInitials(undefined), "?");
  });
});

describe("formatLongDate", () => {
  it("writes weekday, day and month in Italian", () => {
    assert.equal(formatLongDate("2026-10-17"), "sabato 17 ottobre");
  });
});

describe("formatNextWorkout", () => {
  it("says domani for tomorrow", () => {
    const label = formatNextWorkout(
      { date: "2026-10-18", workoutDayName: "Pull" },
      "2026-10-17",
    );
    assert.equal(label, "Prossimo allenamento: domani · Pull");
  });

  it("names the weekday further away", () => {
    const label = formatNextWorkout(
      { date: "2026-10-21", workoutDayName: "Legs" },
      "2026-10-17",
    );
    assert.equal(label, "Prossimo allenamento: mercoledì · Legs");
  });
});

describe("formatSessionsLast7Days", () => {
  it("agrees with the count", () => {
    assert.equal(formatSessionsLast7Days(1), "allenamento negli ultimi 7 giorni");
    assert.equal(formatSessionsLast7Days(3), "allenamenti negli ultimi 7 giorni");
  });
});

describe("formatLastSession", () => {
  it("falls back to a generic title when the day was deleted", () => {
    const formatted = formatLastSession({
      sessionId: 4,
      workoutDayName: null,
      completedAt: new Date("2026-10-16T17:30:00Z"),
      volumeKg: 12400,
    });
    assert.equal(formatted.title, "Allenamento");
    assert.equal(formatted.meta, "venerdì 16 ott · 12.4k\u00A0kg");
  });
});

describe("mapHomeWeek", () => {
  it("marks today and rest days", () => {
    const days = mapHomeWeek(
      [
        { date: "2026-10-12", weekday: 0, workoutDayId: 11, workoutDayName: "Push" },
        { date: "2026-10-13", weekday: 1, workoutDayId: null, workoutDayName: null },
      ],
      "2026-10-13",
    );
    assert.deepEqual(days, [
      {
        dateKey: "2026-10-12",
        weekdayLabel: "Lun",
        dayNumber: 12,
        isToday: false,
        workoutDayId: 11,
        workoutDayName: "Push",
        isRest: false,
      },
      {
        dateKey: "2026-10-13",
        weekdayLabel: "Mar",
        dayNumber: 13,
        isToday: true,
        workoutDayId: null,
        workoutDayName: null,
        isRest: true,
      },
    ]);
  });
});

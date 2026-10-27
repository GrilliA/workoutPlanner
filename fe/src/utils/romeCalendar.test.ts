import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addRomeDays,
  daysBetweenDateKeys,
  formatLongDate,
  formatShortDate,
  isNumberSpokenWithVowel,
  isValidDateKey,
  toRomeDateKey,
  withDatePreposition,
} from "./romeCalendar.ts";

describe("toRomeDateKey", () => {
  it("uses the Rome day, not the UTC one", () => {
    // 23:30 UTC on 27 October is already 28 October in Rome (UTC+1 after the DST change).
    assert.equal(toRomeDateKey(new Date("2026-10-27T23:30:00Z")), "2026-10-28");
    assert.equal(toRomeDateKey(new Date("2026-10-27T22:30:00Z")), "2026-10-27");
  });

  it("uses the Rome day in summer time too (UTC+2)", () => {
    assert.equal(toRomeDateKey(new Date("2026-06-30T22:30:00Z")), "2026-07-01");
    assert.equal(toRomeDateKey(new Date("2026-06-30T21:30:00Z")), "2026-06-30");
  });
});

describe("isValidDateKey", () => {
  it("accepts real days between 2000 and 2099", () => {
    assert.equal(isValidDateKey("2026-10-28"), true);
    assert.equal(isValidDateKey("2028-02-29"), true);
    assert.equal(isValidDateKey("2000-01-01"), true);
    assert.equal(isValidDateKey("2099-12-31"), true);
  });

  it("refuses impossible days, other formats and other centuries", () => {
    assert.equal(isValidDateKey("2026-02-29"), false);
    assert.equal(isValidDateKey("2026-13-01"), false);
    assert.equal(isValidDateKey("28/10/2026"), false);
    assert.equal(isValidDateKey(""), false);
    assert.equal(isValidDateKey("1999-12-31"), false);
    assert.equal(isValidDateKey("2100-01-01"), false);
    assert.equal(isValidDateKey("2026-04-31"), false);
    assert.equal(isValidDateKey("2026-00-10"), false);
    assert.equal(isValidDateKey("2026-01-00"), false);
    assert.equal(isValidDateKey("2026-1-01"), false);
    assert.equal(isValidDateKey("2026-10-28T00:00:00Z"), false);
  });
});

describe("daysBetweenDateKeys", () => {
  it("counts calendar days across the DST change", () => {
    assert.equal(daysBetweenDateKeys("2026-10-22", "2026-10-28"), 6);
    assert.equal(daysBetweenDateKeys("2026-10-24", "2026-10-26"), 2);
    assert.equal(daysBetweenDateKeys("2026-10-28", "2026-10-25"), -3);
    assert.equal(daysBetweenDateKeys("2026-10-28", "2026-10-28"), 0);
  });

  it("spans the whole range the API accepts", () => {
    assert.equal(daysBetweenDateKeys("2000-01-01", "2099-12-31"), 36_524);
  });

  it("matches addRomeDays", () => {
    assert.equal(daysBetweenDateKeys("2026-03-28", addRomeDays("2026-03-28", 40)), 40);
  });
});

describe("addRomeDays", () => {
  it("goes over month ends, leap days and the year", () => {
    assert.equal(addRomeDays("2026-01-31", 1), "2026-02-01");
    assert.equal(addRomeDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addRomeDays("2026-02-28", 1), "2026-03-01");
    assert.equal(addRomeDays("2026-12-31", 1), "2027-01-01");
    assert.equal(addRomeDays("2026-03-01", -31), "2026-01-29");
  });

  it("is a calendar day across the DST changes", () => {
    assert.equal(addRomeDays("2026-03-28", 1), "2026-03-29");
    assert.equal(addRomeDays("2026-03-29", 1), "2026-03-30");
    assert.equal(addRomeDays("2026-10-24", 2), "2026-10-26");
  });

  it("works at the edges of the API range", () => {
    assert.equal(addRomeDays("2000-01-01", -1), "1999-12-31");
    assert.equal(addRomeDays("2099-12-31", 1), "2100-01-01");
  });
});

describe("formatLongDate", () => {
  it("formats the calendar day itself, whatever the time zone", () => {
    assert.equal(formatLongDate("2026-10-28"), "28 ottobre 2026");
    assert.equal(formatLongDate("2027-01-01"), "1 gennaio 2027");
  });

  it("formats the edges of the API range and month ends", () => {
    assert.equal(formatLongDate("2000-01-01"), "1 gennaio 2000");
    assert.equal(formatLongDate("2099-12-31"), "31 dicembre 2099");
    assert.equal(formatLongDate("2028-02-29"), "29 febbraio 2028");
    assert.equal(formatLongDate("2026-10-31"), "31 ottobre 2026");
  });
});

describe("formatShortDate", () => {
  it("drops the year of the current year", () => {
    assert.equal(formatShortDate("2026-09-29", "2026-10-28"), "29 set");
  });

  it("keeps the year of a day just after the turn of the year", () => {
    assert.equal(formatShortDate("2027-01-01", "2026-12-31"), "1 gen 2027");
  });

  it("keeps the year of another year", () => {
    assert.equal(formatShortDate("2025-12-31", "2026-01-02"), "31 dic 2025");
  });
});

describe("withDatePreposition", () => {
  it("elides before 1, 8 and 11", () => {
    assert.equal(withDatePreposition("al", "2026-11-01"), "all'1 novembre 2026");
    assert.equal(withDatePreposition("dal", "2026-11-08"), "dall'8 novembre 2026");
    assert.equal(withDatePreposition("il", "2026-11-11"), "l'11 novembre 2026");
    assert.equal(withDatePreposition("del", "2026-11-08"), "dell'8 novembre 2026");
  });

  it("keeps the full preposition before other days", () => {
    assert.equal(withDatePreposition("dal", "2026-11-02"), "dal 2 novembre 2026");
    assert.equal(withDatePreposition("al", "2026-11-18"), "al 18 novembre 2026");
    assert.equal(withDatePreposition("il", "2026-11-02"), "il 2 novembre 2026");
    assert.equal(withDatePreposition("del", "2026-11-28"), "del 28 novembre 2026");
  });

  it("uses the given date format", () => {
    const shortDate = (dateKey: string) => formatShortDate(dateKey, "2026-10-26");

    assert.equal(withDatePreposition("al", "2026-11-05", shortDate), "al 5 nov");
    assert.equal(withDatePreposition("al", "2026-11-08", shortDate), "all'8 nov");
  });
});

describe("isNumberSpokenWithVowel", () => {
  it("is true for uno, otto, undici, ottanta… and ottocento…", () => {
    assert.equal(isNumberSpokenWithVowel(1), true);
    assert.equal(isNumberSpokenWithVowel(8), true);
    assert.equal(isNumberSpokenWithVowel(11), true);
    assert.equal(isNumberSpokenWithVowel(80), true);
    assert.equal(isNumberSpokenWithVowel(83), true);
    assert.equal(isNumberSpokenWithVowel(812), true);
  });

  it("is false for the others", () => {
    assert.equal(isNumberSpokenWithVowel(2), false);
    assert.equal(isNumberSpokenWithVowel(6), false);
    assert.equal(isNumberSpokenWithVowel(18), false);
    assert.equal(isNumberSpokenWithVowel(28), false);
    assert.equal(isNumberSpokenWithVowel(100), false);
  });
});

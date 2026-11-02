import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describePausePreview, pauseDatesError, previewPause } from "./pause.ts";

const november = { startsOn: "2026-11-01", endsOn: "2026-11-30" };

describe("previewPause", () => {
  it("moves nothing when the paid period ends before the pause", () => {
    assert.deepEqual(
      previewPause({ paidThrough: "2026-10-25", billingDay: 25, pause: november }),
      { paidThrough: "2026-10-25", billingDay: 25 },
    );
  });

  it("moves by the whole pause when the paid period ends inside it", () => {
    assert.deepEqual(
      previewPause({ paidThrough: "2026-11-05", billingDay: 5, pause: november }),
      { paidThrough: "2026-12-05", billingDay: 5 },
    );
  });

  it("moves by the whole pause when the paid period ends after it", () => {
    assert.deepEqual(
      previewPause({ paidThrough: "2026-12-10", billingDay: 10, pause: november }),
      { paidThrough: "2027-01-09", billingDay: 9 },
    );
  });

  it("moves when the paid period ends on the first day of the pause", () => {
    assert.deepEqual(
      previewPause({ paidThrough: "2026-11-01", billingDay: 1, pause: november }),
      { paidThrough: "2026-12-01", billingDay: 1 },
    );
  });

  it("follows the example of the design: 28/10 with a pause 27/10–05/11 becomes 07/11", () => {
    assert.deepEqual(
      previewPause({
        paidThrough: "2026-10-28",
        billingDay: 28,
        pause: { startsOn: "2026-10-27", endsOn: "2026-11-05" },
      }),
      { paidThrough: "2026-11-07", billingDay: 7 },
    );
  });
});

// Cases of `applyPause` in be/src/services/subscription.test.ts, plus month ends and the
// edges of the date range: the copy must give the same "paid through" the API will save.
describe("previewPause, same results as applyPause", () => {
  it("moves nothing when paid-through is the day before the pause", () => {
    assert.deepEqual(
      previewPause({ paidThrough: "2026-10-31", billingDay: 31, pause: november }),
      { paidThrough: "2026-10-31", billingDay: 31 },
    );
  });

  it("follows the end of a month and a leap day", () => {
    assert.deepEqual(
      previewPause({
        paidThrough: "2026-01-31",
        billingDay: 31,
        pause: { startsOn: "2026-01-31", endsOn: "2026-02-01" },
      }),
      { paidThrough: "2026-02-02", billingDay: 2 },
    );
    assert.deepEqual(
      previewPause({
        paidThrough: "2028-02-28",
        billingDay: 28,
        pause: { startsOn: "2028-02-01", endsOn: "2028-02-01" },
      }),
      { paidThrough: "2028-02-29", billingDay: 29 },
    );
    assert.deepEqual(
      previewPause({
        paidThrough: "2026-02-28",
        billingDay: 28,
        pause: { startsOn: "2026-02-28", endsOn: "2026-02-28" },
      }),
      { paidThrough: "2026-03-01", billingDay: 1 },
    );
  });

  it("works on the first and the last day the API accepts", () => {
    assert.deepEqual(
      previewPause({
        paidThrough: "2000-01-01",
        billingDay: 1,
        pause: { startsOn: "2000-01-01", endsOn: "2000-01-01" },
      }),
      { paidThrough: "2000-01-02", billingDay: 2 },
    );
    // The pause dates stop at 2099, the shifted paid-through may go past it (up to 2199).
    assert.deepEqual(
      previewPause({
        paidThrough: "2099-12-31",
        billingDay: 31,
        pause: { startsOn: "2099-12-01", endsOn: "2099-12-31" },
      }),
      { paidThrough: "2100-01-31", billingDay: 31 },
    );
  });

  it("does not move across the DST change by an hour", () => {
    assert.deepEqual(
      previewPause({
        paidThrough: "2026-03-29",
        billingDay: 29,
        pause: { startsOn: "2026-03-28", endsOn: "2026-03-30" },
      }),
      { paidThrough: "2026-04-01", billingDay: 1 },
    );
  });
});

describe("describePausePreview", () => {
  it("counts the days as pauseLengthDays: 10 for 27/10–05/11, 180 for the longest", () => {
    assert.match(
      describePausePreview(
        { paidThrough: "2026-10-28", billingDay: 28 },
        { startsOn: "2026-10-27", endsOn: "2026-11-05" },
      ),
      /^Pausa di 10 giorni\./,
    );
    assert.match(
      describePausePreview(
        { paidThrough: "2026-11-01", billingDay: 1 },
        { startsOn: "2026-11-01", endsOn: "2027-04-29" },
      ),
      /^Pausa di 180 giorni\./,
    );
  });

  it("moves paid-through when it is the first day of the pause", () => {
    assert.equal(
      describePausePreview({ paidThrough: "2026-11-01", billingDay: 1 }, november),
      "Pausa di 30 giorni. «Pagato fino al» passa dall'1 novembre 2026 all'1 dicembre 2026.",
    );
  });

  it("follows the contract example 05/11 + 01/11–30/11 → 05/12", () => {
    assert.equal(
      describePausePreview({ paidThrough: "2026-11-05", billingDay: 5 }, november),
      "Pausa di 30 giorni. «Pagato fino al» passa dal 5 novembre 2026 al 5 dicembre 2026.",
    );
  });

  it("counts the first and the last day of the pause", () => {
    const oneDay = { startsOn: "2026-11-01", endsOn: "2026-11-01" };

    assert.match(describePausePreview({ paidThrough: "2026-11-05", billingDay: 5 }, oneDay), /^Pausa di 1 giorno\./);
  });

  it("says where the paid period moves", () => {
    assert.equal(
      describePausePreview({ paidThrough: "2026-10-28", billingDay: 28 }, { startsOn: "2026-10-27", endsOn: "2026-11-05" }),
      "Pausa di 10 giorni. «Pagato fino al» passa dal 28 ottobre 2026 al 7 novembre 2026.",
    );
  });

  it("says when nothing moves because it had already expired", () => {
    assert.equal(
      describePausePreview({ paidThrough: "2026-10-25", billingDay: 25 }, november),
      "Pausa di 30 giorni. «Pagato fino al» resta il 25 ottobre 2026: era già scaduto all'inizio della pausa.",
    );
  });
});

describe("pauseDatesError", () => {
  const context = { today: "2026-10-26", startedOn: "2026-09-01" };

  it("accepts a valid pause", () => {
    assert.equal(pauseDatesError(november, context), null);
  });

  it("refuses an end before the start", () => {
    assert.equal(
      pauseDatesError({ startsOn: "2026-11-02", endsOn: "2026-11-01" }, context),
      "La fine della pausa non può essere prima dell'inizio.",
    );
  });

  it("refuses a start more than 31 days ago", () => {
    assert.equal(
      pauseDatesError({ startsOn: "2026-09-24", endsOn: "2026-10-01" }, context),
      "La pausa può iniziare al massimo 31 giorni fa.",
    );
    assert.equal(pauseDatesError({ startsOn: "2026-09-25", endsOn: "2026-10-01" }, context), null);
  });

  it("refuses more than 180 days", () => {
    assert.equal(
      pauseDatesError({ startsOn: "2026-11-01", endsOn: "2027-04-30" }, context),
      "La pausa può durare al massimo 180 giorni.",
    );
    assert.equal(pauseDatesError({ startsOn: "2026-11-01", endsOn: "2027-04-29" }, context), null);
  });

  it("accepts a pause that starts today, yesterday or exactly 31 days ago", () => {
    assert.equal(pauseDatesError({ startsOn: "2026-10-26", endsOn: "2026-10-26" }, context), null);
    assert.equal(pauseDatesError({ startsOn: "2026-10-25", endsOn: "2026-11-05" }, context), null);
    assert.equal(pauseDatesError({ startsOn: "2026-09-25", endsOn: "2026-09-25" }, context), null);
  });

  it("accepts a pause that already ended, within 31 days (a late injury)", () => {
    assert.equal(pauseDatesError({ startsOn: "2026-10-01", endsOn: "2026-10-10" }, context), null);
  });

  it("counts 31 days back across a month end", () => {
    const firstOfMarch = { today: "2026-03-01", startedOn: "2026-01-01" };

    assert.equal(pauseDatesError({ startsOn: "2026-01-29", endsOn: "2026-03-01" }, firstOfMarch), null);
    assert.equal(
      pauseDatesError({ startsOn: "2026-01-28", endsOn: "2026-03-01" }, firstOfMarch),
      "La pausa può iniziare al massimo 31 giorni fa.",
    );
  });

  it("accepts a pause that starts on the first day of the subscription", () => {
    assert.equal(
      pauseDatesError(
        { startsOn: "2026-10-21", endsOn: "2026-10-30" },
        { today: "2026-10-26", startedOn: "2026-10-21" },
      ),
      null,
    );
  });

  it("checks in the same order as the API: the end before the start comes first", () => {
    assert.equal(
      pauseDatesError({ startsOn: "2026-08-01", endsOn: "2026-07-01" }, context),
      "La fine della pausa non può essere prima dell'inizio.",
    );
  });

  it("refuses a start before the subscription", () => {
    assert.equal(
      pauseDatesError(
        { startsOn: "2026-10-20", endsOn: "2026-10-30" },
        { today: "2026-10-26", startedOn: "2026-10-21" },
      ),
      "La pausa non può iniziare prima dell'abbonamento.",
    );
  });
});

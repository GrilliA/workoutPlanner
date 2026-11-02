import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PaymentPreview } from "../../../../../../api/schemas/subscription.ts";
import type { Payment } from "../../../../../../api/schemas/subscription.ts";
import {
  chosenPaymentOption,
  doesCoverageCrossPause,
  lastPaymentMethod,
  paidOnError,
  paymentPeriodsLabel,
} from "./paymentForm.ts";

const november = { startsOn: "2026-11-01", endsOn: "2026-11-30" };

describe("doesCoverageCrossPause", () => {
  it("warns for the contract example: 25/10–25/11 across a pause 01/11–30/11", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-10-25", coversTo: "2026-11-25" }, november), true);
  });

  it("does not warn for a coverage that starts on the last day of the pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-11-30", coversTo: "2026-12-30" }, november), false);
  });

  it("does not warn for a coverage that ends before the pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-09-30", coversTo: "2026-10-31" }, november), false);
  });

  it("warns for a coverage that reaches the first day of the pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-10-01", coversTo: "2026-11-01" }, november), true);
  });

  it("warns for a coverage that starts inside the pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-11-10", coversTo: "2026-12-10" }, november), true);
  });
});

describe("doesCoverageCrossPause at the edges", () => {
  it("warns for a coverage that starts the day before the last day of the pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-11-29", coversTo: "2026-12-29" }, november), true);
  });

  it("does not warn for a coverage that starts after the pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-12-01", coversTo: "2027-01-01" }, november), false);
  });

  it("warns for a coverage that contains the whole pause", () => {
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-10-15", coversTo: "2027-01-15" }, november), true);
  });

  it("does not warn for a one-day pause on the day the coverage starts", () => {
    const oneDay = { startsOn: "2026-11-01", endsOn: "2026-11-01" };

    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-11-01", coversTo: "2026-12-01" }, oneDay), false);
    assert.equal(doesCoverageCrossPause({ coversFrom: "2026-10-31", coversTo: "2026-11-30" }, oneDay), true);
  });

  it("warns on the contract example, as the dialog picks it: expired 25/10, paid 26/10", () => {
    const preview: PaymentPreview = {
      paidOn: "2026-10-26",
      periods: 1,
      suggestedStart: "paid_through",
      suggestedAmountCents: 8000,
      isSuggestedAmountCapped: false,
      options: [
        { start: "paid_through", coversFrom: "2026-10-25", coversTo: "2026-11-25", isAllowed: true },
        { start: "paid_on", coversFrom: "2026-10-26", coversTo: "2026-11-26", isAllowed: true },
      ],
    };
    const option = chosenPaymentOption(preview, null);

    assert.equal(option === null ? null : doesCoverageCrossPause(option, november), true);
  });
});

describe("paymentPeriodsLabel", () => {
  it("names months and weeks for a single period", () => {
    assert.equal(paymentPeriodsLabel({ periodUnit: "month", periodCount: 1 }), "Mesi pagati");
    assert.equal(paymentPeriodsLabel({ periodUnit: "week", periodCount: 1 }), "Settimane pagate");
  });

  it("says how long each period is otherwise", () => {
    assert.equal(
      paymentPeriodsLabel({ periodUnit: "month", periodCount: 3 }),
      "Periodi pagati (3 mesi l'uno)",
    );
    assert.equal(
      paymentPeriodsLabel({ periodUnit: "week", periodCount: 12 }),
      "Periodi pagati (12 settimane l'uno)",
    );
  });
});

describe("paidOnError", () => {
  it("accepts today and the past", () => {
    assert.equal(paidOnError("2026-10-26", "2026-10-26"), null);
    assert.equal(paidOnError("2026-01-01", "2026-10-26"), null);
  });

  it("refuses a future day", () => {
    assert.equal(
      paidOnError("2026-10-27", "2026-10-26"),
      "La data del pagamento non può essere nel futuro.",
    );
  });

  it("accepts the first day the API accepts and refuses an impossible day", () => {
    assert.equal(paidOnError("2000-01-01", "2026-10-26"), null);
    assert.equal(paidOnError("2026-02-29", "2026-10-26"), "Data non valida (tra il 2000 e il 2099).");
  });

  it("refuses the day after today across a month end", () => {
    assert.equal(paidOnError("2026-11-01", "2026-10-31"), "La data del pagamento non può essere nel futuro.");
    assert.equal(paidOnError("2026-10-31", "2026-10-31"), null);
  });

  it("refuses an empty or out of range day", () => {
    assert.equal(paidOnError("", "2026-10-26"), "Data non valida (tra il 2000 e il 2099).");
    assert.equal(paidOnError("1999-12-31", "2026-10-26"), "Data non valida (tra il 2000 e il 2099).");
  });
});

describe("chosenPaymentOption", () => {
  const preview: PaymentPreview = {
    paidOn: "2026-10-26",
    periods: 1,
    suggestedStart: "paid_through",
    suggestedAmountCents: 8000,
    isSuggestedAmountCapped: false,
    options: [
      { start: "paid_through", coversFrom: "2026-11-17", coversTo: "2026-12-17", isAllowed: true },
      { start: "paid_on", coversFrom: "2026-10-26", coversTo: "2026-11-26", isAllowed: false },
    ],
  };

  it("uses the suggested start when nothing is picked", () => {
    assert.equal(chosenPaymentOption(preview, null)?.start, "paid_through");
  });

  it("falls back to the suggested start when the picked one is not allowed", () => {
    assert.equal(chosenPaymentOption(preview, "paid_on")?.start, "paid_through");
  });

  it("keeps an allowed pick", () => {
    const bothAllowed: PaymentPreview = {
      ...preview,
      options: preview.options.map((option) => ({ ...option, isAllowed: true })),
    };

    assert.equal(chosenPaymentOption(bothAllowed, "paid_on")?.start, "paid_on");
  });
});

describe("chosenPaymentOption after a long break", () => {
  it("uses the payment day the API suggests", () => {
    const preview: PaymentPreview = {
      paidOn: "2026-10-26",
      periods: 1,
      suggestedStart: "paid_on",
      suggestedAmountCents: 8000,
      isSuggestedAmountCapped: false,
      options: [
        { start: "paid_through", coversFrom: "2026-08-01", coversTo: "2026-09-01", isAllowed: true },
        { start: "paid_on", coversFrom: "2026-10-26", coversTo: "2026-11-26", isAllowed: true },
      ],
    };

    assert.equal(chosenPaymentOption(preview, null)?.coversTo, "2026-11-26");
    assert.equal(chosenPaymentOption(preview, "paid_through")?.coversTo, "2026-09-01");
  });
});

describe("lastPaymentMethod", () => {
  const payment = (id: number, method: Payment["method"]): Payment => ({
    id,
    amountCents: 8000,
    paidOn: "2026-10-01",
    method,
    periods: 1,
    coversFrom: "2026-10-01",
    coversTo: "2026-11-01",
    note: null,
    canUndo: false,
    createdAt: "2026-10-01T00:00:00.000Z",
  });

  it("has no method before the first payment or while the history loads", () => {
    assert.equal(lastPaymentMethod([]), null);
    assert.equal(lastPaymentMethod(undefined), null);
  });

  it("takes the first payment of the list, the newest one in the API order", () => {
    assert.equal(lastPaymentMethod([payment(2, "paypal"), payment(1, "cash")]), "paypal");
  });
});

describe("lastPaymentMethod", () => {
  const payment = (id: number, paidOn: string, method: "cash" | "satispay" | "paypal") => ({
    id,
    amountCents: 8000,
    paidOn,
    method,
    periods: 1,
    coversFrom: paidOn,
    coversTo: paidOn,
    note: null,
    canUndo: false,
    createdAt: "2026-10-26T00:00:00.000Z",
  });

  it("is null before the first payment", () => {
    assert.equal(lastPaymentMethod([]), null);
    assert.equal(lastPaymentMethod(undefined), null);
  });

  it("takes the payment recorded last, also when it is dated in the past", () => {
    // Newest paidOn first, as the API sorts them; id 9 was recorded last with an old date.
    const payments = [
      payment(8, "2026-10-20", "satispay"),
      payment(9, "2026-09-15", "cash"),
      payment(7, "2026-09-10", "paypal"),
    ];

    assert.equal(lastPaymentMethod(payments), "cash");
  });
});

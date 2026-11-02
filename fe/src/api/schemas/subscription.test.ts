import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clientSubscriptionResponseSchema,
  createdPauseSchema,
  offerSchema,
  offersSchema,
  paymentPreviewSchema,
  paymentRequestSchema,
  paymentsSchema,
  recordedPaymentSchema,
  subscriptionDetailSchema,
  subscriptionRequestSchema,
} from "./subscription.ts";

// The backend answers with Drizzle rows: `date` columns are "YYYY-MM-DD" strings, `timestamp`
// columns are Date objects that JSON turns into ISO strings. Going through JSON here gives
// the body the client really receives (be/src/services/subscriptionAccess.ts).
const overTheWire = (body: unknown): unknown => JSON.parse(JSON.stringify(body));

const createdAt = new Date("2026-09-17T08:30:00.000Z");

const offerRow = {
  id: 3,
  name: "Coaching mensile",
  priceCents: 8000,
  periodUnit: "month",
  periodCount: 1,
  isRecurring: true,
  archivedAt: null,
  createdAt,
  updatedAt: createdAt,
};

// Same fields and order as `toSubscription`.
const subscriptionRow = {
  id: 7,
  athleteId: 42,
  offerId: 3,
  agreedPriceCents: 8000,
  periodUnit: "month",
  periodCount: 1,
  isRecurring: true,
  startedOn: "2026-09-17",
  paidThrough: "2026-11-17",
  billingDay: 17,
  endedOn: null,
  createdAt,
  updatedAt: createdAt,
};

// Same fields as `toPayment`.
const paymentRow = {
  id: 31,
  amountCents: 8000,
  paidOn: "2026-10-22",
  method: "satispay",
  periods: 1,
  coversFrom: "2026-10-17",
  coversTo: "2026-11-17",
  note: null,
  canUndo: true,
  createdAt,
};

// Same fields as `toPause`.
const pauseRow = {
  id: 4,
  startsOn: "2026-11-01",
  endsOn: "2026-11-30",
  canRemove: true,
  createdAt,
};

describe("offer schemas", () => {
  it("read an offer as the backend sends it, timestamps as ISO strings", () => {
    const offer = offerSchema.parse(overTheWire(offerRow));

    assert.equal(offer.createdAt, "2026-09-17T08:30:00.000Z");
    assert.equal(offer.archivedAt, null);
  });

  it("read an archived offer in the list", () => {
    const archived = { ...offerRow, id: 4, archivedAt: new Date("2026-10-01T10:00:00.000Z") };
    const offers = offersSchema.parse(overTheWire([offerRow, archived]));

    assert.deepEqual(
      offers.map((offer) => offer.archivedAt),
      [null, "2026-10-01T10:00:00.000Z"],
    );
  });

  it("refuse a period unit outside the contract", () => {
    assert.equal(offerSchema.safeParse(overTheWire({ ...offerRow, periodUnit: "day" })).success, false);
  });
});

describe("clientSubscriptionResponseSchema", () => {
  it("reads the detail of the contract example", () => {
    const detail = clientSubscriptionResponseSchema.parse(
      overTheWire({
        subscription: subscriptionRow,
        state: { status: "active", daysLeft: 25, pausedUntil: null },
        activePause: null,
      }),
    );

    assert.equal(detail.subscription?.paidThrough, "2026-11-17");
    assert.equal(detail.state?.status, "active");
  });

  it("reads a paused subscription with its active pause", () => {
    const detail = clientSubscriptionResponseSchema.parse(
      overTheWire({
        subscription: { ...subscriptionRow, paidThrough: "2026-12-17" },
        state: { status: "paused", daysLeft: 46, pausedUntil: "2026-11-30" },
        activePause: pauseRow,
      }),
    );

    assert.equal(detail.activePause?.canRemove, true);
    assert.equal(detail.state?.pausedUntil, "2026-11-30");
  });

  it("reads an ended subscription with a pause that can no longer be removed", () => {
    const detail = clientSubscriptionResponseSchema.parse(
      overTheWire({
        subscription: { ...subscriptionRow, endedOn: "2026-10-26" },
        state: { status: "ended", daysLeft: -3, pausedUntil: null },
        activePause: { ...pauseRow, canRemove: false },
      }),
    );

    assert.equal(detail.subscription?.endedOn, "2026-10-26");
    assert.equal(detail.activePause?.canRemove, false);
  });

  it("reads a subscription whose offer was deleted", () => {
    const detail = clientSubscriptionResponseSchema.parse(
      overTheWire({
        subscription: { ...subscriptionRow, offerId: null },
        state: { status: "expired", daysLeft: -1, pausedUntil: null },
        activePause: null,
      }),
    );

    assert.equal(detail.subscription?.offerId, null);
  });

  it("reads the answer without a subscription (`NO_SUBSCRIPTION`)", () => {
    assert.deepEqual(
      clientSubscriptionResponseSchema.parse({ subscription: null, state: null, activePause: null }),
      { subscription: null, state: null, activePause: null },
    );
  });

  it("refuses a half empty answer and a status outside the contract", () => {
    assert.equal(
      clientSubscriptionResponseSchema.safeParse({ subscription: null, state: { status: "active", daysLeft: 1, pausedUntil: null }, activePause: null }).success,
      false,
    );
    assert.equal(
      clientSubscriptionResponseSchema.safeParse(
        overTheWire({
          subscription: subscriptionRow,
          state: { status: "late", daysLeft: 1, pausedUntil: null },
          activePause: null,
        }),
      ).success,
      false,
    );
  });

  it("is the shape the PUT answers with, never the empty one", () => {
    assert.equal(
      subscriptionDetailSchema.safeParse({ subscription: null, state: null, activePause: null }).success,
      false,
    );
  });
});

describe("payment schemas", () => {
  it("read the preview of the contract example", () => {
    const preview = paymentPreviewSchema.parse({
      paidOn: "2026-10-22",
      periods: 1,
      suggestedStart: "paid_through",
      suggestedAmountCents: 8000,
      isSuggestedAmountCapped: false,
      options: [
        { start: "paid_through", coversFrom: "2026-10-17", coversTo: "2026-11-17", isAllowed: true },
        { start: "paid_on", coversFrom: "2026-10-22", coversTo: "2026-11-22", isAllowed: true },
      ],
    });

    assert.deepEqual(
      preview.options.map((option) => option.start),
      ["paid_through", "paid_on"],
    );
  });

  it("read the history, with and without a note", () => {
    const payments = paymentsSchema.parse(
      overTheWire([paymentRow, { ...paymentRow, id: 30, canUndo: false, note: "in palestra", method: "bank_transfer" }]),
    );

    assert.deepEqual(
      payments.map((payment) => [payment.method, payment.note, payment.canUndo]),
      [
        ["satispay", null, true],
        ["bank_transfer", "in palestra", false],
      ],
    );
  });

  it("read the 201 of POST payments", () => {
    const recorded = recordedPaymentSchema.parse(
      overTheWire({ payment: paymentRow, subscription: subscriptionRow, start: "paid_through" }),
    );

    assert.equal(recorded.subscription.paidThrough, "2026-11-17");
    assert.equal(recorded.start, "paid_through");
  });

  it("refuse a method outside the contract", () => {
    assert.equal(paymentsSchema.safeParse(overTheWire([{ ...paymentRow, method: "card" }])).success, false);
  });
});

describe("createdPauseSchema", () => {
  it("reads the 201 of POST pause", () => {
    const created = createdPauseSchema.parse(
      overTheWire({ pause: pauseRow, subscription: { ...subscriptionRow, paidThrough: "2026-12-17", billingDay: 17 } }),
    );

    assert.equal(created.pause.endsOn, "2026-11-30");
    assert.equal(created.subscription.paidThrough, "2026-12-17");
  });
});

describe("request schemas", () => {
  it("send `endedOn: null` to resume, and leave absent fields out of the body", () => {
    assert.equal(JSON.stringify(subscriptionRequestSchema.parse({ endedOn: null })), '{"endedOn":null}');
    assert.equal(
      JSON.stringify(subscriptionRequestSchema.parse({ offerId: undefined, agreedPriceCents: 7500, startedOn: undefined })),
      '{"agreedPriceCents":7500}',
    );
  });

  it("send the payment body of the contract example", () => {
    const body = {
      amountCents: 8000,
      paidOn: "2026-10-22",
      method: "satispay" as const,
      periods: 1,
      start: "paid_through" as const,
      note: null,
    };

    assert.deepEqual(JSON.parse(JSON.stringify(paymentRequestSchema.parse(body))), body);
  });
});

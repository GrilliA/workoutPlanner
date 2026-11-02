import { z } from "zod";

// Contract: docs/contracts/pt-registro.md (R2). Dates are calendar days `YYYY-MM-DD`,
// timestamps are ISO strings, money is integer cents.

export const periodUnitSchema = z.enum(["month", "week"]);
export const paymentMethodSchema = z.enum(["cash", "bank_transfer", "satispay", "paypal", "other"]);
export const paymentStartSchema = z.enum(["paid_through", "paid_on"]);
export const subscriptionStatusSchema = z.enum(["active", "expiring", "expired", "paused", "ended"]);

export const offerSchema = z.object({
  id: z.number(),
  name: z.string(),
  priceCents: z.number(),
  periodUnit: periodUnitSchema,
  periodCount: z.number(),
  isRecurring: z.boolean(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const offersSchema = z.array(offerSchema);

export const subscriptionSchema = z.object({
  id: z.number(),
  athleteId: z.number(),
  offerId: z.number().nullable(),
  agreedPriceCents: z.number(),
  periodUnit: periodUnitSchema,
  periodCount: z.number(),
  isRecurring: z.boolean(),
  startedOn: z.string(),
  paidThrough: z.string(),
  billingDay: z.number(),
  endedOn: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const subscriptionStateSchema = z.object({
  status: subscriptionStatusSchema,
  daysLeft: z.number(),
  pausedUntil: z.string().nullable(),
});

export const pauseSchema = z.object({
  id: z.number(),
  startsOn: z.string(),
  endsOn: z.string(),
  canRemove: z.boolean(),
  createdAt: z.string(),
});

export const subscriptionDetailSchema = z.object({
  subscription: subscriptionSchema,
  state: subscriptionStateSchema,
  activePause: pauseSchema.nullable(),
});

/** `GET .../subscription` answers 200 also without a subscription, with all three fields null. */
export const clientSubscriptionResponseSchema = z.union([
  subscriptionDetailSchema,
  z.object({
    subscription: z.null(),
    state: z.null(),
    activePause: z.null(),
  }),
]);

export const paymentSchema = z.object({
  id: z.number(),
  amountCents: z.number(),
  paidOn: z.string(),
  method: paymentMethodSchema,
  periods: z.number(),
  coversFrom: z.string(),
  coversTo: z.string(),
  note: z.string().nullable(),
  canUndo: z.boolean(),
  createdAt: z.string(),
});

export const paymentsSchema = z.array(paymentSchema);

export const paymentOptionSchema = z.object({
  start: paymentStartSchema,
  coversFrom: z.string(),
  coversTo: z.string(),
  isAllowed: z.boolean(),
});

export const paymentPreviewSchema = z.object({
  paidOn: z.string(),
  periods: z.number(),
  suggestedStart: paymentStartSchema,
  suggestedAmountCents: z.number(),
  isSuggestedAmountCapped: z.boolean(),
  options: z.array(paymentOptionSchema),
});

export const recordedPaymentSchema = z.object({
  payment: paymentSchema,
  subscription: subscriptionSchema,
  start: paymentStartSchema,
});

export const createdPauseSchema = z.object({
  pause: pauseSchema,
  subscription: subscriptionSchema,
});

export const offerRequestSchema = z.object({
  name: z.string(),
  priceCents: z.number().int(),
  periodUnit: periodUnitSchema,
  periodCount: z.number().int(),
  isRecurring: z.boolean(),
});

export const offerPatchRequestSchema = offerRequestSchema.partial().extend({
  archived: z.boolean().optional(),
});

/** Creation needs `offerId` and `startedOn`; an edit sends only the changed fields. */
export const subscriptionRequestSchema = z.object({
  offerId: z.number().int().optional(),
  agreedPriceCents: z.number().int().optional(),
  startedOn: z.string().optional(),
  paidThrough: z.string().optional(),
  endedOn: z.string().nullable().optional(),
});

export const paymentRequestSchema = z.object({
  amountCents: z.number().int(),
  paidOn: z.string(),
  method: paymentMethodSchema,
  periods: z.number().int(),
  start: paymentStartSchema,
  note: z.string().nullable(),
});

export const pauseRequestSchema = z.object({
  startsOn: z.string(),
  endsOn: z.string(),
});

export type PeriodUnit = z.infer<typeof periodUnitSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type PaymentStart = z.infer<typeof paymentStartSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionState = z.infer<typeof subscriptionStateSchema>;
export type Pause = z.infer<typeof pauseSchema>;
export type SubscriptionDetail = z.infer<typeof subscriptionDetailSchema>;
export type ClientSubscriptionResponse = z.infer<typeof clientSubscriptionResponseSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type PaymentOption = z.infer<typeof paymentOptionSchema>;
export type PaymentPreview = z.infer<typeof paymentPreviewSchema>;
export type OfferInput = z.input<typeof offerRequestSchema>;
export type OfferPatch = z.input<typeof offerPatchRequestSchema>;
export type SubscriptionInput = z.input<typeof subscriptionRequestSchema>;
export type PaymentInput = z.input<typeof paymentRequestSchema>;
export type PauseInput = z.input<typeof pauseRequestSchema>;

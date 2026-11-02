import { z } from "zod";
import { apiRequest } from "./client";
import {
  clientSubscriptionResponseSchema,
  createdPauseSchema,
  offerPatchRequestSchema,
  offerRequestSchema,
  offerSchema,
  offersSchema,
  pauseRequestSchema,
  paymentPreviewSchema,
  paymentRequestSchema,
  paymentsSchema,
  recordedPaymentSchema,
  subscriptionDetailSchema,
  subscriptionRequestSchema,
  type OfferInput,
  type OfferPatch,
  type PauseInput,
  type PaymentInput,
  type SubscriptionInput,
} from "./schemas/subscription";

export const getCoachOffers = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiRequest("/coach/offers", { schema: offersSchema, signal });

export const createCoachOffer = (input: OfferInput) =>
  apiRequest("/coach/offers", {
    method: "POST",
    body: offerRequestSchema.parse(input),
    schema: offerSchema,
  });

export const updateCoachOffer = (offerId: number, patch: OfferPatch) =>
  apiRequest(`/coach/offers/${offerId}`, {
    method: "PATCH",
    body: offerPatchRequestSchema.parse(patch),
    schema: offerSchema,
  });

export const getCoachClientSubscription = (
  athleteId: number,
  { signal }: { signal?: AbortSignal } = {},
) =>
  apiRequest(`/coach/clients/${athleteId}/subscription`, {
    schema: clientSubscriptionResponseSchema,
    signal,
  });

/** 201 when it creates the subscription, 200 when it edits it: same body either way. */
export const saveCoachClientSubscription = (athleteId: number, input: SubscriptionInput) =>
  apiRequest(`/coach/clients/${athleteId}/subscription`, {
    method: "PUT",
    body: subscriptionRequestSchema.parse(input),
    schema: subscriptionDetailSchema,
  });

export const getCoachClientPaymentPreview = (
  athleteId: number,
  query: { paidOn: string; periods: number },
  { signal }: { signal?: AbortSignal } = {},
) => {
  const search = new URLSearchParams({
    paidOn: query.paidOn,
    periods: String(query.periods),
  });

  return apiRequest(`/coach/clients/${athleteId}/payments/preview?${search.toString()}`, {
    schema: paymentPreviewSchema,
    signal,
  });
};

export const getCoachClientPayments = (
  athleteId: number,
  { signal }: { signal?: AbortSignal } = {},
) =>
  apiRequest(`/coach/clients/${athleteId}/payments`, { schema: paymentsSchema, signal });

export const recordCoachClientPayment = (athleteId: number, input: PaymentInput) =>
  apiRequest(`/coach/clients/${athleteId}/payments`, {
    method: "POST",
    body: paymentRequestSchema.parse(input),
    schema: recordedPaymentSchema,
  });

export const undoCoachClientPayment = (athleteId: number, paymentId: number) =>
  apiRequest(`/coach/clients/${athleteId}/payments/${paymentId}`, {
    method: "DELETE",
    schema: z.undefined(),
  });

export const createCoachClientPause = (athleteId: number, input: PauseInput) =>
  apiRequest(`/coach/clients/${athleteId}/pause`, {
    method: "POST",
    body: pauseRequestSchema.parse(input),
    schema: createdPauseSchema,
  });

/** Cancels a pause that has not started, or ends a running one yesterday. */
export const removeCoachClientPause = (athleteId: number) =>
  apiRequest(`/coach/clients/${athleteId}/pause`, {
    method: "DELETE",
    schema: z.undefined(),
  });

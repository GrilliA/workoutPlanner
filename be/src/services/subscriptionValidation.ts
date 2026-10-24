import { PERIOD_UNITS, type PeriodUnit } from "../db/schema/coachoffers";
import { PAYMENT_METHODS, type PaymentMethod } from "../db/schema/subscriptionpayments";
import { isValidIsoDate } from "./assignmentStatus";
import { addRomeDays } from "./stats";
import { PAYMENT_STARTS, pauseLengthDays, type PauseDates, type PaymentStart } from "./subscription";

type Invalid = { ok: false; error: string };
type Valid<T> = { ok: true; value: T };
type Parse<T> = (value: unknown) => Valid<T> | Invalid;

// Postgres `integer`: a larger id would reach the database and fail there with a 500.
const MAX_DATABASE_ID = 2_147_483_647;
const MAX_CENTS = 1_000_000;
const MAX_OFFER_NAME_LENGTH = 100;
const MAX_PERIOD_COUNT = 52;
const MAX_PAYMENT_PERIODS = 12;
const MAX_NOTE_LENGTH = 500;
const MAX_PAUSE_DAYS = 180;
const MAX_PAUSE_DAYS_AGO = 31;
const EARLIEST_DATE = "2000-01-01";
const LATEST_DATE = "2099-12-31";
const DIGITS_PATTERN = /^\d+$/;

const INVALID_BODY: Invalid = { ok: false, error: "Invalid request body" };
const NO_FIELDS: Invalid = { ok: false, error: "At least one field is required" };

export type OfferInput = {
  name: string;
  priceCents: number;
  periodUnit: PeriodUnit;
  periodCount: number;
  isRecurring: boolean;
};

export type OfferPatch = Partial<OfferInput> & { archived?: boolean };

/** Absent fields are `undefined`; `endedOn: null` reopens the subscription. */
export type SubscriptionInput = {
  offerId?: number;
  agreedPriceCents?: number;
  startedOn?: string;
  paidThrough?: string;
  endedOn?: string | null;
};

type SubscriptionDates = {
  startedOn: string;
  paidThrough: string;
  endedOn: string | null;
};

type NewSubscriptionInput = SubscriptionDates & {
  offerId: number;
  agreedPriceCents: number | undefined;
};

export type PaymentInput = {
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  periods: number;
  /** Missing means the suggested start, decided on the locked subscription. */
  start: PaymentStart | undefined;
  note: string | null;
};

export type PaymentPreviewQuery = {
  paidOn: string;
  periods: number;
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIntegerBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export const isDatabaseId = (value: unknown): value is number =>
  isIntegerBetween(value, 1, MAX_DATABASE_ID);

// Outside these years a date is a typo, and later arithmetic could leave the range Postgres accepts.
const isCalendarDate = (value: unknown): value is string =>
  typeof value === "string" &&
  isValidIsoDate(value) &&
  value >= EARLIEST_DATE &&
  value <= LATEST_DATE;

const hasAnyField = (input: Record<string, unknown>): boolean =>
  Object.values(input).some((value) => value !== undefined);

const integerBetween =
  (field: string, min: number, max: number): Parse<number> =>
  (value) => {
    if (!isIntegerBetween(value, min, max)) {
      return { ok: false, error: `${field} must be an integer between ${min} and ${max}` };
    }

    return { ok: true, value };
  };

const oneOf =
  <T extends string>(values: readonly T[], error: string): Parse<T> =>
  (value) => {
    const match = values.find((candidate) => candidate === value);

    if (match === undefined) {
      return { ok: false, error };
    }

    return { ok: true, value: match };
  };

const booleanField =
  (field: string): Parse<boolean> =>
  (value) => {
    if (typeof value !== "boolean") {
      return { ok: false, error: `${field} must be a boolean` };
    }

    return { ok: true, value };
  };

const calendarDate =
  (field: string): Parse<string> =>
  (value) => {
    if (!isCalendarDate(value)) {
      return { ok: false, error: `${field} must be YYYY-MM-DD` };
    }

    return { ok: true, value };
  };

/** An absent field stays `undefined`; a present one must pass `parse`. */
const optional =
  <T>(parse: Parse<T>): Parse<T | undefined> =>
  (value) => {
    if (value === undefined) {
      return { ok: true, value: undefined };
    }

    return parse(value);
  };

const parseOfferName: Parse<string> = (value) => {
  const name = typeof value === "string" ? value.trim() : "";

  if (name.length === 0) {
    return { ok: false, error: "name is required" };
  }

  if (name.length > MAX_OFFER_NAME_LENGTH) {
    return { ok: false, error: `name must be at most ${MAX_OFFER_NAME_LENGTH} characters` };
  }

  return { ok: true, value: name };
};

const parsePriceCents = integerBetween("priceCents", 0, MAX_CENTS);
const parsePeriodUnit = oneOf(PERIOD_UNITS, "periodUnit must be month or week");
const parsePeriodCount = integerBetween("periodCount", 1, MAX_PERIOD_COUNT);
const parseIsRecurring = booleanField("isRecurring");

export const validateOfferInput = (body: unknown): Valid<OfferInput> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  const name = parseOfferName(body.name);

  if (!name.ok) {
    return name;
  }

  const priceCents = parsePriceCents(body.priceCents);

  if (!priceCents.ok) {
    return priceCents;
  }

  const periodUnit = parsePeriodUnit(body.periodUnit);

  if (!periodUnit.ok) {
    return periodUnit;
  }

  const periodCount = parsePeriodCount(body.periodCount);

  if (!periodCount.ok) {
    return periodCount;
  }

  const isRecurring = optional(parseIsRecurring)(body.isRecurring);

  if (!isRecurring.ok) {
    return isRecurring;
  }

  return {
    ok: true,
    value: {
      name: name.value,
      priceCents: priceCents.value,
      periodUnit: periodUnit.value,
      periodCount: periodCount.value,
      isRecurring: isRecurring.value ?? true,
    },
  };
};

export const validateOfferPatch = (body: unknown): Valid<OfferPatch> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  const name = optional(parseOfferName)(body.name);

  if (!name.ok) {
    return name;
  }

  const priceCents = optional(parsePriceCents)(body.priceCents);

  if (!priceCents.ok) {
    return priceCents;
  }

  const periodUnit = optional(parsePeriodUnit)(body.periodUnit);

  if (!periodUnit.ok) {
    return periodUnit;
  }

  const periodCount = optional(parsePeriodCount)(body.periodCount);

  if (!periodCount.ok) {
    return periodCount;
  }

  const isRecurring = optional(parseIsRecurring)(body.isRecurring);

  if (!isRecurring.ok) {
    return isRecurring;
  }

  const archived = optional(booleanField("archived"))(body.archived);

  if (!archived.ok) {
    return archived;
  }

  const patch = {
    name: name.value,
    priceCents: priceCents.value,
    periodUnit: periodUnit.value,
    periodCount: periodCount.value,
    isRecurring: isRecurring.value,
    archived: archived.value,
  };

  if (!hasAnyField(patch)) {
    return NO_FIELDS;
  }

  return { ok: true, value: patch };
};

const parseOfferId: Parse<number> = (value) => {
  if (!isDatabaseId(value)) {
    return { ok: false, error: "Invalid offer id" };
  }

  return { ok: true, value };
};

const parseEndedOn: Parse<string | null> = (value) => {
  if (value !== null && !isCalendarDate(value)) {
    return { ok: false, error: "endedOn must be YYYY-MM-DD or null" };
  }

  return { ok: true, value };
};

/** Shape and ranges only: what is required depends on whether the subscription exists. */
export const validateSubscriptionInput = (body: unknown): Valid<SubscriptionInput> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  const offerId = optional(parseOfferId)(body.offerId);

  if (!offerId.ok) {
    return offerId;
  }

  const agreedPriceCents = optional(integerBetween("agreedPriceCents", 0, MAX_CENTS))(
    body.agreedPriceCents,
  );

  if (!agreedPriceCents.ok) {
    return agreedPriceCents;
  }

  const startedOn = optional(calendarDate("startedOn"))(body.startedOn);

  if (!startedOn.ok) {
    return startedOn;
  }

  const paidThrough = optional(calendarDate("paidThrough"))(body.paidThrough);

  if (!paidThrough.ok) {
    return paidThrough;
  }

  const endedOn = optional(parseEndedOn)(body.endedOn);

  if (!endedOn.ok) {
    return endedOn;
  }

  return {
    ok: true,
    value: {
      offerId: offerId.value,
      agreedPriceCents: agreedPriceCents.value,
      startedOn: startedOn.value,
      paidThrough: paidThrough.value,
      endedOn: endedOn.value,
    },
  };
};

const validateSubscriptionDates = (
  dates: SubscriptionDates,
): Valid<SubscriptionDates> | Invalid => {
  if (dates.paidThrough < dates.startedOn) {
    return { ok: false, error: "paidThrough must be on or after startedOn" };
  }

  const endsBeforeStart = dates.endedOn !== null && dates.endedOn < dates.startedOn;

  if (endsBeforeStart) {
    return { ok: false, error: "endedOn must be on or after startedOn" };
  }

  return { ok: true, value: dates };
};

export const validateNewSubscription = (
  input: SubscriptionInput,
): Valid<NewSubscriptionInput> | Invalid => {
  if (input.offerId === undefined) {
    return { ok: false, error: "offerId is required" };
  }

  if (input.startedOn === undefined) {
    return { ok: false, error: "startedOn must be YYYY-MM-DD" };
  }

  const dates = validateSubscriptionDates({
    startedOn: input.startedOn,
    paidThrough: input.paidThrough ?? input.startedOn,
    endedOn: input.endedOn ?? null,
  });

  if (!dates.ok) {
    return dates;
  }

  return {
    ok: true,
    value: { ...dates.value, offerId: input.offerId, agreedPriceCents: input.agreedPriceCents },
  };
};

/**
 * paidThrough only moves through payments and pauses, which can be undone; editing it here
 * would leave nothing to undo back to. Dates are checked on the saved values with the body on top.
 */
export const validateSubscriptionUpdate = (
  input: SubscriptionInput,
  saved: SubscriptionDates,
): Valid<{ startedOn: string; endedOn: string | null }> | Invalid => {
  if (!hasAnyField(input)) {
    return NO_FIELDS;
  }

  const changesPaidThrough =
    input.paidThrough !== undefined && input.paidThrough !== saved.paidThrough;

  if (changesPaidThrough) {
    return { ok: false, error: "paidThrough cannot be changed after creation" };
  }

  const endedOn = input.endedOn === undefined ? saved.endedOn : input.endedOn;
  const dates = validateSubscriptionDates({
    startedOn: input.startedOn ?? saved.startedOn,
    paidThrough: saved.paidThrough,
    endedOn,
  });

  if (!dates.ok) {
    return dates;
  }

  return { ok: true, value: { startedOn: dates.value.startedOn, endedOn: dates.value.endedOn } };
};

const paidOnUntil =
  (today: string): Parse<string> =>
  (value) => {
    const paidOn = calendarDate("paidOn")(value);

    if (!paidOn.ok) {
      return paidOn;
    }

    if (paidOn.value > today) {
      return { ok: false, error: "paidOn must not be in the future" };
    }

    return paidOn;
  };

const parsePaymentPeriods = integerBetween("periods", 1, MAX_PAYMENT_PERIODS);

const parseNote: Parse<string | null> = (value) => {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false, error: "note must be a string or null" };
  }

  const note = value.trim();

  if (note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `note must be at most ${MAX_NOTE_LENGTH} characters` };
  }

  if (note.length === 0) {
    return { ok: true, value: null };
  }

  return { ok: true, value: note };
};

export const validatePaymentInput = (
  body: unknown,
  today: string,
): Valid<PaymentInput> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  const amountCents = integerBetween("amountCents", 0, MAX_CENTS)(body.amountCents);

  if (!amountCents.ok) {
    return amountCents;
  }

  const paidOn = paidOnUntil(today)(body.paidOn);

  if (!paidOn.ok) {
    return paidOn;
  }

  const method = oneOf(
    PAYMENT_METHODS,
    `method must be one of ${PAYMENT_METHODS.join(", ")}`,
  )(body.method);

  if (!method.ok) {
    return method;
  }

  const periods = optional(parsePaymentPeriods)(body.periods);

  if (!periods.ok) {
    return periods;
  }

  const start = optional(oneOf(PAYMENT_STARTS, "start must be paid_through or paid_on"))(
    body.start,
  );

  if (!start.ok) {
    return start;
  }

  const note = parseNote(body.note);

  if (!note.ok) {
    return note;
  }

  return {
    ok: true,
    value: {
      amountCents: amountCents.value,
      paidOn: paidOn.value,
      method: method.value,
      periods: periods.value ?? 1,
      start: start.value,
      note: note.value,
    },
  };
};

/**
 * Query values are text. Only digits become a number, so "1.5", "1e1" or " 2" stay strings
 * and fail the integer check.
 */
const parseQueryPeriods: Parse<number> = (value) => {
  if (value === undefined) {
    return { ok: true, value: 1 };
  }

  const isDigits = typeof value === "string" && DIGITS_PATTERN.test(value);
  const periods = isDigits ? Number(value) : value;

  return parsePaymentPeriods(periods);
};

export const validatePaymentPreviewQuery = (
  query: Record<string, unknown>,
  today: string,
): Valid<PaymentPreviewQuery> | Invalid => {
  const paidOn = paidOnUntil(today)(query.paidOn);

  if (!paidOn.ok) {
    return paidOn;
  }

  const periods = parseQueryPeriods(query.periods);

  if (!periods.ok) {
    return periods;
  }

  return { ok: true, value: { paidOn: paidOn.value, periods: periods.value } };
};

/** Checks that need only the body and today; `startsOn >= startedOn` waits for the subscription. */
export const validatePauseInput = (body: unknown, today: string): Valid<PauseDates> | Invalid => {
  if (!isJsonObject(body)) {
    return INVALID_BODY;
  }

  const startsOn = calendarDate("startsOn")(body.startsOn);

  if (!startsOn.ok) {
    return startsOn;
  }

  const endsOn = calendarDate("endsOn")(body.endsOn);

  if (!endsOn.ok) {
    return endsOn;
  }

  const pause = { startsOn: startsOn.value, endsOn: endsOn.value };

  if (pause.endsOn < pause.startsOn) {
    return { ok: false, error: "endsOn must be on or after startsOn" };
  }

  // A pause recorded late (a forgotten injury) is fine; older ones would rewrite settled months.
  const earliestStart = addRomeDays(today, -MAX_PAUSE_DAYS_AGO);

  if (pause.startsOn < earliestStart) {
    return { ok: false, error: `startsOn must be at most ${MAX_PAUSE_DAYS_AGO} days ago` };
  }

  if (pauseLengthDays(pause) > MAX_PAUSE_DAYS) {
    return { ok: false, error: `Pause must be at most ${MAX_PAUSE_DAYS} days` };
  }

  return { ok: true, value: pause };
};

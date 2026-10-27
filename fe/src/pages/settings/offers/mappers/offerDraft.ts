import type { Offer, OfferInput, OfferPatch, PeriodUnit } from "@api";
import { formatCentsAsInput, parseEurosToCents } from "@utils/money";

/** The new / edit offer form, as typed. */
export type OfferDraft = {
  name: string;
  priceText: string;
  periodCountText: string;
  periodUnit: PeriodUnit;
  isRecurring: boolean;
};

export type OfferDraftErrors = Partial<Record<"name" | "price" | "periodCount", string>>;

const MAX_NAME_LENGTH = 100;
const MAX_PERIOD_COUNT = 52;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

export const EMPTY_OFFER_DRAFT: OfferDraft = {
  name: "",
  priceText: "",
  periodCountText: "1",
  periodUnit: "month",
  isRecurring: true,
};

export function draftFromOffer(offer: Offer): OfferDraft {
  return {
    name: offer.name,
    priceText: formatCentsAsInput(offer.priceCents),
    periodCountText: String(offer.periodCount),
    periodUnit: offer.periodUnit,
    isRecurring: offer.isRecurring,
  };
}

const nameError = (name: string): string | undefined => {
  if (name.length === 0) {
    return "Inserisci il nome dell'offerta.";
  }

  if (name.includes("\0")) {
    return "Il testo contiene un carattere non valido.";
  }

  if (name.length > MAX_NAME_LENGTH) {
    return "Il nome può avere al massimo 100 caratteri.";
  }

  return undefined;
};

const parsePeriodCount = (text: string): number | null => {
  const trimmed = text.trim();

  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }

  const periodCount = Number(trimmed);
  const isInRange = periodCount >= 1 && periodCount <= MAX_PERIOD_COUNT;

  return isInRange ? periodCount : null;
};

/** The same checks as the API, so a bad form never reaches it. */
export function validateOfferDraft(
  draft: OfferDraft,
): { ok: true; value: OfferInput } | { ok: false; errors: OfferDraftErrors } {
  const name = draft.name.trim();
  const price = parseEurosToCents(draft.priceText);
  const periodCount = parsePeriodCount(draft.periodCountText);
  const periodCountError =
    periodCount === null ? "La durata deve essere da 1 a 52 mesi o settimane." : undefined;
  const errors: OfferDraftErrors = {
    name: nameError(name),
    price: price.ok ? undefined : price.error,
    periodCount: periodCountError,
  };
  const hasErrors = Object.values(errors).some((error) => error !== undefined);

  if (hasErrors || !price.ok || periodCount === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      priceCents: price.cents,
      periodUnit: draft.periodUnit,
      periodCount,
      isRecurring: draft.isRecurring,
    },
  };
}

/** Only the fields that differ from the saved offer; empty when nothing changed. */
export function offerChanges(offer: Offer, input: OfferInput): OfferPatch {
  const fields = Object.keys(input) as (keyof OfferInput)[];
  const changedFields = fields.filter((field) => input[field] !== offer[field]);

  return Object.fromEntries(changedFields.map((field) => [field, input[field]]));
}

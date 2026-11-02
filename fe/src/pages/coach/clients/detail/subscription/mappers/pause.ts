import { addRomeDays, daysBetweenDateKeys, withDatePreposition } from "@utils/romeCalendar";

export type PauseDates = {
  startsOn: string;
  endsOn: string;
};

const MAX_PAUSE_DAYS = 180;
const MAX_PAUSE_DAYS_AGO = 31;

/** Both the first and the last day count, as in `pauseLengthDays` of be/src/services/subscription.ts. */
function pauseLengthDays(pause: PauseDates): number {
  return daysBetweenDateKeys(pause.startsOn, pause.endsOn) + 1;
}

const dayOfMonth = (dateKey: string): number => Number(dateKey.slice(8, 10));

/**
 * Copy of `applyPause` (be/src/services/subscription.ts), so the coach sees the new
 * "paid through" before saving. Paid days inside the pause are enjoyed after it; a paid
 * period that ends before the pause has none, so nothing moves.
 */
export function previewPause(input: {
  paidThrough: string;
  billingDay: number;
  pause: PauseDates;
}): { paidThrough: string; billingDay: number } {
  const isPaidIntoPause = input.paidThrough >= input.pause.startsOn;

  if (!isPaidIntoPause) {
    return { paidThrough: input.paidThrough, billingDay: input.billingDay };
  }

  const shiftedPaidThrough = addRomeDays(input.paidThrough, pauseLengthDays(input.pause));

  return { paidThrough: shiftedPaidThrough, billingDay: dayOfMonth(shiftedPaidThrough) };
}

/** The sentence of the pause preview. */
export function describePausePreview(
  subscription: { paidThrough: string; billingDay: number },
  pause: PauseDates,
): string {
  const length = pauseLengthDays(pause);
  const lengthText = length === 1 ? "Pausa di 1 giorno." : `Pausa di ${length} giorni.`;
  const preview = previewPause({ ...subscription, pause });
  const { paidThrough } = subscription;

  if (preview.paidThrough === paidThrough) {
    return `${lengthText} «Pagato fino al» resta ${withDatePreposition("il", paidThrough)}: era già scaduto all'inizio della pausa.`;
  }

  const fromText = withDatePreposition("dal", paidThrough);
  const toText = withDatePreposition("al", preview.paidThrough);

  return `${lengthText} «Pagato fino al» passa ${fromText} ${toText}.`;
}

/** The checks the API makes on a new pause, with its copy; null when the dates are fine. */
export function pauseDatesError(
  pause: PauseDates,
  context: { today: string; startedOn: string },
): string | null {
  if (pause.endsOn < pause.startsOn) {
    return "La fine della pausa non può essere prima dell'inizio.";
  }

  if (pause.startsOn < addRomeDays(context.today, -MAX_PAUSE_DAYS_AGO)) {
    return "La pausa può iniziare al massimo 31 giorni fa.";
  }

  if (pauseLengthDays(pause) > MAX_PAUSE_DAYS) {
    return "La pausa può durare al massimo 180 giorni.";
  }

  if (pause.startsOn < context.startedOn) {
    return "La pausa non può iniziare prima dell'abbonamento.";
  }

  return null;
}

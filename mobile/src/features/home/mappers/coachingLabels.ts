import type { AthleteCoaching, AthleteCoachingStatus } from "../../../api";
import { dateFromRomeDateKey } from "../../../utils/romeCalendar";

/** Colore della riga: indaco quando va tutto bene, giallo da rinnovare, neutro per pausa e fine. */
export type CoachingStatusTone = "data" | "warning" | "neutral";

const TONE_BY_STATUS: Record<AthleteCoachingStatus, CoachingStatusTone> = {
  active: "data",
  expiring: "warning",
  expired: "warning",
  paused: "neutral",
  ended: "neutral",
};

export const coachingStatusTone = (status: AthleteCoachingStatus): CoachingStatusTone =>
  TONE_BY_STATUS[status];

/** "12 dicembre" da una data YYYY-MM-DD di Roma. */
const formatDayAndMonth = (dateKey: string): string =>
  dateFromRomeDateKey(dateKey).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

const formatExpiring = (daysLeft: number): string => {
  if (daysLeft <= 0) {
    return "Coaching in scadenza oggi";
  }
  if (daysLeft === 1) {
    return "Coaching in scadenza domani";
  }
  return `Coaching in scadenza tra ${daysLeft} giorni`;
};

const formatPaused = (pausedUntil: string | null): string => {
  if (pausedUntil === null) {
    return "Coaching in pausa";
  }
  return `Coaching in pausa · fino al ${formatDayAndMonth(pausedUntil)}`;
};

/** Riga di stato del coaching. Solo testo: mai prezzi né inviti a pagare. */
export const formatCoachingStatus = (coaching: AthleteCoaching): string => {
  switch (coaching.status) {
    case "active":
      return `Coaching attivo · fino al ${formatDayAndMonth(coaching.paidThrough)}`;
    case "expiring":
      return formatExpiring(coaching.daysLeft);
    case "expired":
      return "Coaching da rinnovare · La scheda resta attiva";
    case "paused":
      return formatPaused(coaching.pausedUntil);
    case "ended":
      return "Coaching concluso";
  }
};

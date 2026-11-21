import type { AthleteCoaching, AthleteCoachingStatus } from "../../../api";
import { formatDayMonth } from "../../../utils/romeCalendar";

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

/** In italiano l'articolo si elide davanti a 1, 8 e 11: "all'11 dicembre", non "al 11". */
const formatUntil = (dateKey: string): string => {
  const day = Number(dateKey.slice(8, 10));
  const article = day === 1 || day === 8 || day === 11 ? "all'" : "al ";
  return `fino ${article}${formatDayMonth(dateKey)}`;
};

/** Titolo della riga e, se serve, un dettaglio che va sulla seconda riga. */
export type CoachingStatusText = {
  title: string;
  detail?: string;
};

const formatExpiring = (daysLeft: number): string => {
  if (daysLeft <= 0) {
    return "Coaching in scadenza oggi";
  }
  if (daysLeft === 1) {
    return "Coaching in scadenza domani";
  }
  return `Coaching in scadenza tra ${daysLeft} giorni`;
};

/** Testo di stato del coaching. Solo testo: mai prezzi né inviti a pagare. */
export const formatCoachingStatus = (coaching: AthleteCoaching): CoachingStatusText => {
  switch (coaching.status) {
    case "active":
      return { title: "Coaching attivo", detail: formatUntil(coaching.paidThrough) };
    case "expiring":
      return { title: formatExpiring(coaching.daysLeft) };
    case "expired":
      return { title: "Coaching da rinnovare", detail: "La scheda resta attiva" };
    case "paused":
      return {
        title: "Coaching in pausa",
        detail: coaching.pausedUntil === null ? undefined : formatUntil(coaching.pausedUntil),
      };
    case "ended":
      return { title: "Coaching concluso" };
  }
};

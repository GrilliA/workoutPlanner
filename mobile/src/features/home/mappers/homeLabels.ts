import type { AthleteHome } from "../../../api";
import { addRomeDays, dateFromRomeDateKey } from "../../../utils/romeCalendar";
import { formatKgValue } from "./mapHomeStats";

type LastSession = NonNullable<AthleteHome["lastSession"]>;
type NextWorkout = NonNullable<AthleteHome["nextWorkout"]>;

/** "Ciao, Marco" col solo nome; senza nome resta "Ciao". */
export const formatGreeting = (fullName: string | null | undefined): string => {
  const firstName = fullName?.trim().split(/\s+/)[0];
  if (!firstName) {
    return "Ciao";
  }
  return `Ciao, ${firstName}`;
};

/** "sabato 17 ottobre" da una data YYYY-MM-DD di Roma. */
export const formatLongDate = (dateKey: string): string =>
  dateFromRomeDateKey(dateKey).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

const formatWeekdayName = (dateKey: string): string =>
  dateFromRomeDateKey(dateKey).toLocaleDateString("it-IT", {
    weekday: "long",
    timeZone: "UTC",
  });

/** "Prossimo allenamento: domani · Pull" / "…: mercoledì · Pull". */
export const formatNextWorkout = (
  nextWorkout: NextWorkout,
  todayKey: string,
): string => {
  const isTomorrow = nextWorkout.date === addRomeDays(todayKey, 1);
  const when = isTomorrow ? "domani" : formatWeekdayName(nextWorkout.date);
  return `Prossimo allenamento: ${when} · ${nextWorkout.workoutDayName}`;
};

/** "domani" o "lunedì 9 novembre": quando parte la scheda in arrivo. */
export const formatUpcomingStart = (startsAt: string, todayKey: string): string =>
  startsAt === addRomeDays(todayKey, 1) ? "domani" : formatLongDate(startsAt);

/** Giorni di calendario da oggi a una data futura (1 = domani). */
export const daysUntil = (dateKey: string, todayKey: string): number =>
  Math.round(
    (dateFromRomeDateKey(dateKey).getTime() - dateFromRomeDateKey(todayKey).getTime()) /
      86_400_000,
  );

export const formatSessionsLast7Days = (count: number): string => {
  if (count === 1) {
    return "allenamento negli ultimi 7 giorni";
  }
  return "allenamenti negli ultimi 7 giorni";
};

/** Titolo e riga "venerdì 21 ott · 12.4k kg" dell'ultimo allenamento. */
export const formatLastSession = (
  lastSession: LastSession,
): { title: string; meta: string } => {
  const date = lastSession.completedAt.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  });
  const title = lastSession.workoutDayName ?? "Allenamento";
  // Spazio non divisibile: "kg" non va a capo da solo.
  return { title, meta: `${date} · ${formatKgValue(lastSession.volumeKg)}\u00A0kg` };
};

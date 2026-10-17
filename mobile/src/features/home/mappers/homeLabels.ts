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

export const formatInitials = (fullName: string | null | undefined): string => {
  const parts = (fullName ?? "").trim().split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

import type { UserStats } from "../../../api";
import type { HomeRecentSession, HomeStat } from "../types";

export const formatKgValue = (kg: number): string => {
  if (kg <= 0) {
    return "0";
  }

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k`;
  }

  return String(Math.round(kg));
};

const formatWorkoutDate = (date: Date): string =>
  date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
  });

export const hasSessionHistory = (stats: UserStats): boolean =>
  stats.totalSessions > 0 || stats.recentSessions.length > 0;

export const mapHomeStats = (stats: UserStats): HomeStat[] => {
  if (!hasSessionHistory(stats)) {
    return [
      {
        id: "volume",
        label: "VOLUME TOTALE",
        value: "—",
        unit: "KG",
        trend: "Nessun dato",
      },
      {
        id: "frequency",
        label: "FREQUENZA",
        value: "—",
        unit: "/SETT",
        trend: "Nessun dato",
      },
    ];
  }

  return [
    {
      id: "volume",
      label: "VOLUME TOTALE",
      value: formatKgValue(stats.volumeKg),
      unit: "KG",
      trend: stats.volumeKg > 0 ? "Ultimi 7 giorni" : "Nessun dato",
    },
    {
      id: "frequency",
      label: "FREQUENZA",
      value: String(stats.workoutsPerWeek),
      unit: "/SETT",
      trend: stats.workoutsPerWeek > 0 ? "Questa settimana" : "Stabile",
    },
  ];
};

export const mapHomeRecentSessions = (
  stats: UserStats,
  limit = 5,
): HomeRecentSession[] =>
  stats.recentSessions.slice(0, limit).map((session) => ({
    id: session.sessionId,
    name: session.workoutName,
    dateLabel: formatWorkoutDate(session.completedAt),
    durationMin: session.durationMin,
    volumeKg: session.volumeKg,
    volumeLabel: `${formatKgValue(session.volumeKg)} kg`,
  }));

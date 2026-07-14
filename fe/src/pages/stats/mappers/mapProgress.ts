import type { UserStats } from "@api";
import {
  hasSessionHistory,
  mapRecentSessions,
  mapStats,
} from "@dashboard/mappers/mapDashboard";
import type { ProgressData, ProgressStat } from "../types";

const formatKgValue = (kg: number): string => {
  if (kg <= 0) {
    return "0";
  }

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}k`;
  }

  return String(Math.round(kg));
};

const mapExtendedStats = (stats: UserStats): ProgressStat[] => [
  ...mapStats(stats),
  {
    id: "sessions",
    label: "Sessioni",
    value: String(stats.totalSessions),
    unit: "tot",
    trend: stats.totalSessions > 0 ? "Completate" : "Nessun dato",
  },
  {
    id: "average",
    label: "Media",
    value: formatKgValue(stats.averageSessionVolumeKg),
    unit: "kg",
    trend:
      stats.averageSessionVolumeKg > 0 ? "Volume per sessione" : "Nessun dato",
  },
];

export const EMPTY_PROGRESS_PLACEHOLDERS: ProgressStat[] = [
  { id: "volume", label: "Volume", value: "—", unit: "kg", trend: "Nessun dato" },
  { id: "workout", label: "Workout", value: "—", unit: "/sett", trend: "Nessun dato" },
  { id: "streak", label: "Streak", value: "—", unit: "giorni", trend: "Nessun dato" },
  { id: "record", label: "Record", value: "—", unit: "kg", trend: "Nessun dato" },
  { id: "sessions", label: "Sessioni", value: "—", unit: "tot", trend: "Nessun dato" },
  { id: "average", label: "Media", value: "—", unit: "kg", trend: "Nessun dato" },
];

export const buildProgressData = (stats: UserStats): ProgressData => ({
  stats: hasSessionHistory(stats) ? mapExtendedStats(stats) : [],
  dailyBreakdown: stats.dailyBreakdown,
  recentSessions: mapRecentSessions(stats),
  hasSessionHistory: hasSessionHistory(stats),
});

export const isProgressEmpty = (data: ProgressData): boolean =>
  !data.hasSessionHistory && data.recentSessions.length === 0;

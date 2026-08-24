import type { AthleteAnalytics, ExerciseProgression } from "../../../api";
import type { ProgressionChartModel, ProgressionMetric, ProgressionOption } from "../types";
import { formatKgValue } from "../../home/mappers/mapHomeStats";

const CHART_WIDTH = 240;
const CHART_HEIGHT = 72;
const CHART_PADDING = 8;

export const buildProgressionChartModel = (
  progression: ExerciseProgression,
  metric: ProgressionMetric,
): ProgressionChartModel => {
  const values = progression.points
    .map((point, index) => {
      const raw = metric === "e1rm" ? point.bestE1RM : point.bestWeightKg;
      if (raw === null) {
        return null;
      }

      return {
        index,
        value: raw,
        label: point.date,
      };
    })
    .filter((item): item is { index: number; value: number; label: string } => item !== null);

  if (values.length === 0) {
    return {
      metric,
      points: [],
      summary: "Nessun dato pesato per questo esercizio nel periodo.",
      hasValues: false,
    };
  }

  const min = Math.min(...values.map((item) => item.value));
  const max = Math.max(...values.map((item) => item.value));
  const span = max - min || 1;

  const points = values.map((item) => {
    const x =
      values.length === 1
        ? CHART_WIDTH / 2
        : CHART_PADDING +
          (item.index / Math.max(1, progression.points.length - 1)) *
            (CHART_WIDTH - CHART_PADDING * 2);
    const normalized = (item.value - min) / span;
    const y = CHART_HEIGHT - CHART_PADDING - normalized * (CHART_HEIGHT - CHART_PADDING * 2);

    return {
      x,
      y,
      label: `${item.label}: ${metric === "e1rm" ? `${item.value} kg e1RM` : `${item.value} kg`}`,
    };
  });

  const latest = values[values.length - 1]!;
  const summary =
    metric === "e1rm"
      ? `Ultimo e1RM stimato: ${latest.value} kg su ${values.length} sessioni con dati validi.`
      : `Ultimo carico massimo: ${latest.value} kg su ${values.length} sessioni con dati validi.`;

  return {
    metric,
    points,
    summary,
    hasValues: true,
  };
};

export const mapExerciseProgressions = (
  analytics: AthleteAnalytics,
): ProgressionOption[] =>
  analytics.exerciseProgressions
    .filter((progression) => progression.points.length > 0)
    .slice(0, 12)
    .map((progression) => {
      const metric: ProgressionMetric =
        progression.prE1RM !== null ? "e1rm" : "weight";
      const prValue =
        metric === "e1rm" ? progression.prE1RM : progression.prWeightKg;

      return {
        exerciseId: progression.exerciseId,
        label: progression.exerciseName,
        prLabel:
          prValue !== null
            ? `PR ${metric === "e1rm" ? "e1RM" : "peso"} · ${formatKgValue(prValue)} kg`
            : "Nessun PR nel periodo",
        charts: {
          e1rm: buildProgressionChartModel(progression, "e1rm"),
          weight: buildProgressionChartModel(progression, "weight"),
        },
      };
    });

export const buildProgressionPolyline = (
  points: ProgressionChartModel["points"],
): string => {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
};

export const progressionMetricLabel = (metric: ProgressionMetric): string =>
  metric === "e1rm" ? "e1RM stimato (kg)" : "Peso max (kg)";

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { AppText, Body, Heading, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import {
  buildProgressionPolyline,
  progressionMetricLabel,
} from "../mappers/mapExerciseProgression";
import type { ProgressionMetric, ProgressionOption } from "../types";

type ExerciseProgressionSectionProps = {
  options: ProgressionOption[];
};

export function ExerciseProgressionSection({ options }: ExerciseProgressionSectionProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    options[0]?.exerciseId ?? null,
  );
  const [metric, setMetric] = useState<ProgressionMetric>("e1rm");

  const nextId = options.some((option) => option.exerciseId === selectedId)
    ? selectedId
    : (options[0]?.exerciseId ?? null);

  if (nextId !== selectedId) {
    setSelectedId(nextId);
  }

  const selected =
    options.find((option) => option.exerciseId === nextId) ?? null;

  if (options.length === 0) {
    return (
      <View style={styles.card}>
        <Heading style={styles.title}>Progressione esercizi</Heading>
        <Body>
          Nessun esercizio con dati pesati nel periodo. Registra peso e ripetizioni per
          vedere l&apos;andamento.
        </Body>
      </View>
    );
  }

  const chart = selected?.charts[metric];
  const polyline = chart ? buildProgressionPolyline(chart.points) : "";

  return (
    <View style={styles.card} accessibilityLabel="Progressione esercizi">
      <Heading style={styles.title}>Progressione esercizi</Heading>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        accessibilityRole="list"
        accessibilityLabel="Seleziona esercizio"
      >
        {options.map((option) => {
          const active = option.exerciseId === (selected?.exerciseId ?? null);
          return (
            <Pressable
              key={option.exerciseId}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => setSelectedId(option.exerciseId)}
              style={[styles.chip, active && styles.chipSelected]}
            >
              <AppText
                variant="label"
                style={active ? styles.chipLabelSelected : styles.chipLabel}
                numberOfLines={1}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {selected ? (
        <>
          <Meta>{selected.prLabel}</Meta>
          <View style={styles.metricRow}>
            {(["e1rm", "weight"] as const).map((value) => {
              const active = metric === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMetric(value)}
                  style={[styles.metricChip, active && styles.chipSelected]}
                >
                  <AppText
                    variant="label"
                    style={active ? styles.chipLabelSelected : styles.chipLabel}
                  >
                    {value === "e1rm" ? "e1RM" : "Peso max"}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {chart && chart.hasValues ? (
            <>
              <Svg
                width="100%"
                height={96}
                viewBox="0 0 240 72"
                accessibilityRole="image"
                accessibilityLabel={chart.summary}
              >
                {polyline ? (
                  <Polyline
                    points={chart.points.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke={colors.data}
                    strokeWidth={2}
                  />
                ) : null}
                {chart.points.map((point) => (
                  <Circle
                    key={point.label}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={colors.data}
                    accessibilityLabel={point.label}
                  />
                ))}
              </Svg>
              <Meta>{progressionMetricLabel(metric)}</Meta>
              <Meta accessibilityRole="text">{chart.summary}</Meta>
            </>
          ) : (
            <Body>
              Nessun dato {metric === "e1rm" ? "e1RM" : "di peso massimo"} per questo
              esercizio nel periodo.
            </Body>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  chip: {
    maxWidth: 200,
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    backgroundColor: colors.ink,
  },
  chipLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  chipLabelSelected: {
    color: colors.onInk,
    fontWeight: "700",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  metricChip: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
  },
});

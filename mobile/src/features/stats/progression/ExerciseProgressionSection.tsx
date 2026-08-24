import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Body, Meta, SectionLabel } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
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

  useEffect(() => {
    if (options.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!options.some((option) => option.exerciseId === selectedId)) {
      setSelectedId(options[0]!.exerciseId);
    }
  }, [options, selectedId]);

  const selected = useMemo(
    () => options.find((option) => option.exerciseId === selectedId) ?? options[0] ?? null,
    [options, selectedId],
  );

  if (options.length === 0) {
    return (
      <View style={styles.card}>
        <SectionLabel>PROGRESSIONE ESERCIZI</SectionLabel>
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
      <SectionLabel>PROGRESSIONE ESERCIZI</SectionLabel>
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
              <Meta style={active ? styles.chipLabelSelected : undefined} numberOfLines={1}>
                {option.label}
              </Meta>
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
                  <Meta style={active ? styles.chipLabelSelected : undefined}>
                    {value === "e1rm" ? "e1RM" : "PESO MAX"}
                  </Meta>
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
                    stroke={colors.accent}
                    strokeWidth={2}
                  />
                ) : null}
                {chart.points.map((point) => (
                  <Circle
                    key={point.label}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={colors.accent}
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  chip: {
    maxWidth: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  chipLabelSelected: {
    color: colors.textHeading,
    fontWeight: "700",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  metricChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
  },
});

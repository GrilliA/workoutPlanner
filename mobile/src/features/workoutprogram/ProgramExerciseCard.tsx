import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Exercise } from "../../api";
import { AppText, Card, Meta } from "../../components";
import { ExerciseMediaFlip } from "../session/ExerciseMediaFlip";
import { colors, radii, spacing } from "../../theme";
import { exerciseEnglishLine, exerciseHeading } from "./exerciseDisplay";
import type { DraftPrescription } from "./prescriptionDraft";

type ProgramExerciseCardProps = {
  exercise: Pick<
    Exercise,
    "name" | "nameIt" | "nameEn" | "imageUrl" | "imageUrlEnd"
  >;
  index: number;
  prescriptions: DraftPrescription[];
  children?: ReactNode;
};

export function ProgramExerciseCard({
  exercise,
  index,
  prescriptions,
  children,
}: ProgramExerciseCardProps) {
  const heading = exerciseHeading(exercise);
  const english = exerciseEnglishLine(exercise);

  return (
    <Card style={styles.card}>
      <View style={styles.media}>
        <ExerciseMediaFlip
          imageUrl={exercise.imageUrl}
          imageUrlEnd={exercise.imageUrlEnd}
          variant="hero"
          placeholder
        />
        <View style={styles.index} accessibilityLabel={`Esercizio ${index}`}>
          <AppText style={styles.indexLabel}>{index}</AppText>
        </View>
      </View>
      <View style={styles.body}>
        <AppText tone="heading" style={styles.title}>
          {heading}
        </AppText>
        {english ? <Meta>{english}</Meta> : null}
        {prescriptions.length === 0 ? (
          <Meta>Senza serie</Meta>
        ) : (
          <>
            <View
              style={styles.legend}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <AppText
                variant="eyebrow"
                tone="muted"
                style={styles.legendLabel}
              >
                {prescriptions.length} serie
              </AppText>
              <AppText
                variant="eyebrow"
                tone="muted"
                style={styles.legendLabel}
              >
                Reps / recupero
              </AppText>
            </View>
            <View style={styles.grid}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                contentContainerStyle={{ flexGrow: 1 }}
              >
                {prescriptions.map((item, cellIndex) => (
                  <View
                    key={item.key}
                    style={[styles.cell, cellIndex > 0 && styles.cellDivider]}
                  >
                    <AppText tone="heading" style={styles.cellReps}>
                      {item.reps.trim() || "—"}
                    </AppText>
                    <Meta style={styles.cellRest}>{item.restSec}s</Meta>
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        )}
        {children}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    gap: 0,
    overflow: "hidden",
  },
  media: {
    position: "relative",
  },
  index: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  indexLabel: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  legendLabel: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  grid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  cell: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 56,
    alignItems: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
  },
  cellDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  cellReps: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  cellRest: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
});

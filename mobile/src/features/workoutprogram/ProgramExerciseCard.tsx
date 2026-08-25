import { type ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import type { Exercise } from "../../api";
import { AppText, Card, Meta } from "../../components";
import { ExerciseMediaFlip } from "../session/ExerciseMediaFlip";
import { colors, radii, spacing } from "../../theme";
import { exerciseEnglishLine, exerciseHeading } from "./exerciseDisplay";

type ProgramExerciseCardProps = {
  exercise: Exercise;
  index: number;
  meta: string;
  children?: ReactNode;
};

export function ProgramExerciseCard({
  exercise,
  index,
  meta,
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
        <Meta>{meta}</Meta>
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
});

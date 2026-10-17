import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import type { MyWorkoutRow, MyWorkoutStatus } from "../types";

const STATUS_LABEL: Record<MyWorkoutStatus, string> = {
  active: "Attiva",
  paused: "In pausa",
  inactive: "Disattiva",
};

type WorkoutRowProps = {
  row: MyWorkoutRow;
  onPress: () => void;
};

/** Riga di "Le mie schede": nome, esercizi, stato, freccia. */
export function WorkoutRow({ row, onPress }: WorkoutRowProps) {
  const isActive = row.status === "active";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText tone="heading" style={styles.name} numberOfLines={1}>
          {row.name}
        </AppText>
        <Meta>{row.meta}</Meta>
      </View>
      <View style={[styles.badge, isActive && styles.badgeActive]}>
        <AppText style={[styles.badgeLabel, isActive && styles.badgeLabelActive]}>
          {STATUS_LABEL[row.status]}
        </AppText>
      </View>
      <AppText style={styles.chevron}>›</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    borderRadius: radii.pill,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: colors.dataBg,
  },
  badgeLabel: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  badgeLabelActive: {
    color: colors.data,
  },
  chevron: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "600",
  },
});

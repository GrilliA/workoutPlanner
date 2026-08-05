import { StyleSheet, View } from "react-native";
import { AppText, BackButton, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";

type SessionFocusHeaderProps = {
  workoutName: string;
  exerciseIndex: number;
  exerciseTotal: number;
  elapsedLabel: string;
  statusLabel: string;
  /** 0–1 progresso sessione (esercizi completati / totale). */
  progress: number;
  onBack?: () => void;
};

/** Header sessione: back + titolo + timer + barra progresso (mock ActiveSession). */
export function SessionFocusHeader({
  workoutName,
  exerciseIndex,
  exerciseTotal,
  elapsedLabel,
  statusLabel,
  progress,
  onBack,
}: SessionFocusHeaderProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.side}>
          {onBack ? <BackButton onPress={onBack} /> : null}
        </View>
        <View style={styles.center}>
          <Meta style={styles.status}>{statusLabel}</Meta>
          <AppText tone="heading" style={styles.title} numberOfLines={1}>
            {workoutName}
          </AppText>
          {exerciseTotal > 0 ? (
            <Meta style={styles.exerciseMeta}>
              Esercizio {exerciseIndex + 1} di {exerciseTotal}
            </Meta>
          ) : null}
        </View>
        <View style={[styles.side, styles.sideEnd]}>
          <AppText tone="accent" style={styles.elapsed}>
            {elapsedLabel}
          </AppText>
        </View>
      </View>
      <View style={styles.track} accessibilityRole="progressbar">
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  side: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideEnd: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    minWidth: 0,
  },
  status: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  exerciseMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  elapsed: {
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    fontSize: 14,
  },
  track: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
});

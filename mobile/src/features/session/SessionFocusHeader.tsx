import { StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../components";
import { colors, spacing } from "../../theme";

type SessionFocusHeaderProps = {
  workoutName: string;
  exerciseIndex: number;
  exerciseTotal: number;
  elapsedLabel: string;
  statusLabel: string;
};

export function SessionFocusHeader({
  workoutName,
  exerciseIndex,
  exerciseTotal,
  elapsedLabel,
  statusLabel,
}: SessionFocusHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Meta style={styles.progress}>
          {workoutName}
          {exerciseTotal > 0
            ? ` · ${exerciseIndex + 1}/${exerciseTotal}`
            : ""}
        </Meta>
        <Meta style={styles.elapsed}>{elapsedLabel}</Meta>
      </View>
      <AppText tone="heading" style={styles.status}>
        {statusLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  progress: {
    flex: 1,
    fontWeight: "600",
    color: colors.muted,
  },
  elapsed: {
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    color: colors.textHeading,
  },
  status: {
    fontSize: 15,
    fontWeight: "600",
  },
});

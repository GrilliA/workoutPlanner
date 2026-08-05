import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, spacing } from "../../theme";

type ExercisePagerProps = {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

/** Nav esercizi stile mock: PRECEDENTE / PROSSIMO. */
export function ExercisePager({
  index,
  total,
  onPrev,
  onNext,
}: ExercisePagerProps) {
  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrev}
        disabled={!canPrev}
        style={({ pressed }) => [
          styles.btn,
          !canPrev && styles.btnDisabled,
          pressed && canPrev && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Esercizio precedente"
      >
        <AppText style={[styles.prevLabel, !canPrev && styles.disabledLabel]}>
          ‹ PRECEDENTE
        </AppText>
      </Pressable>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        style={({ pressed }) => [
          styles.btn,
          styles.btnEnd,
          !canNext && styles.btnDisabled,
          pressed && canNext && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Esercizio successivo"
      >
        <AppText style={[styles.nextLabel, !canNext && styles.disabledLabel]}>
          PROSSIMO ›
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  btn: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  btnEnd: {
    alignItems: "flex-end",
  },
  btnPressed: {
    opacity: 0.7,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  prevLabel: {
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  nextLabel: {
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.accent,
    textTransform: "uppercase",
  },
  disabledLabel: {
    color: colors.muted,
  },
});

import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";

type ExercisePagerProps = {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

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
        <AppText style={[styles.btnLabel, !canPrev && styles.btnLabelDisabled]}>
          ← Prec
        </AppText>
      </Pressable>

      <Meta style={styles.counter}>
        {index + 1} / {total}
      </Meta>

      <Pressable
        onPress={onNext}
        disabled={!canNext}
        style={({ pressed }) => [
          styles.btn,
          !canNext && styles.btnDisabled,
          pressed && canNext && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Esercizio successivo"
      >
        <AppText style={[styles.btnLabel, !canNext && styles.btnLabelDisabled]}>
          Succ →
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
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  btnPressed: {
    opacity: 0.75,
    borderColor: colors.accentBorder,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnLabel: {
    fontWeight: "700",
    color: colors.textHeading,
  },
  btnLabelDisabled: {
    color: colors.muted,
  },
  counter: {
    minWidth: 48,
    textAlign: "center",
    fontWeight: "700",
  },
});

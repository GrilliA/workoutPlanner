import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../../components";
import { colors, spacing } from "../../theme";

type SessionActionBarProps = {
  busy?: boolean;
  onComplete: () => void;
  onAbandon: () => void;
};

/** Barra fissa in basso: TERMINA / ABBANDONA (azioni sessione, non tab app). */
export function SessionActionBar({
  busy = false,
  onComplete,
  onAbandon,
}: SessionActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <PrimaryButton
        label="TERMINA"
        onPress={onComplete}
        disabled={busy}
      />
      <SecondaryButton
        label="ABBANDONA"
        onPress={onAbandon}
        disabled={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});

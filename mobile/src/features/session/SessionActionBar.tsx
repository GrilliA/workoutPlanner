import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText,
  TAB_BAR_HEIGHT,
  TAB_BAR_MIN_BOTTOM_OFFSET,
} from "../../components";
import { colors, radii, shadows, spacing } from "../../theme";
import { useKeyboardVisible } from "../../utils/useKeyboardVisible";

type SessionActionBarProps = {
  busy?: boolean;
  onComplete: () => void;
};

/** Pill flottante, stesso guscio della tab bar: bianco, ombra, niente fascia a tutta larghezza. */
export function SessionActionBar({
  busy = false,
  onComplete,
}: SessionActionBarProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();

  // La pill è assoluta: con la tastiera aperta coprirebbe il campo in modifica.
  if (keyboardVisible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_OFFSET) }]}
    >
      <Pressable
        onPress={onComplete}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Termina allenamento"
        style={({ pressed }) => [
          styles.completeBtn,
          (busy || pressed) && styles.dimmed,
        ]}
      >
        <AppText style={styles.completeLabel}>Termina allenamento</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 15,
  },
  completeBtn: {
    height: TAB_BAR_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.tabBar,
  },
  completeLabel: {
    color: colors.textHeading,
    fontWeight: "800",
    fontSize: 16,
  },
  dimmed: {
    opacity: 0.55,
  },
});

import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";

type SessionActionBarProps = {
  busy?: boolean;
  onComplete: () => void;
  onAbandon: () => void;
};

/** Barra fissa: TERMINA rosso dominante (mock); ABBANDONA dietro conferma. */
export function SessionActionBar({
  busy = false,
  onComplete,
  onAbandon,
}: SessionActionBarProps) {
  const insets = useSafeAreaInsets();
  const [showAbandon, setShowAbandon] = useState(false);

  const requestAbandon = () => {
    Alert.alert(
      "Abbandonare la sessione?",
      "La sessione verrà segnata come abbandonata. Le serie già registrate restano salvate.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Abbandona",
          style: "destructive",
          onPress: onAbandon,
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
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
        <Text style={styles.completeLabel}>TERMINA ALLENAMENTO</Text>
      </Pressable>

      {showAbandon ? (
        <Pressable
          onPress={requestAbandon}
          disabled={busy}
          style={styles.abandonBtn}
          accessibilityRole="button"
          accessibilityLabel="Abbandona sessione"
        >
          <Meta style={styles.abandonLabel}>Abbandona sessione</Meta>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setShowAbandon(true)}
          disabled={busy}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel="Altre azioni"
        >
          <Meta>Altre azioni</Meta>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  completeBtn: {
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeLabel: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.4,
  },
  dimmed: {
    opacity: 0.55,
  },
  moreBtn: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  abandonBtn: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
  },
  abandonLabel: {
    color: colors.danger,
    fontWeight: "700",
  },
});

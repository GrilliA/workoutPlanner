import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Meta, PrimaryButton } from "../../components";
import { colors, spacing } from "../../theme";

type SessionActionBarProps = {
  busy?: boolean;
  onComplete: () => void;
  onAbandon: () => void;
};

/** Barra fissa: TERMINA dominante; ABBANDONA nascosto + conferma. */
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
      "Le serie non salvate andranno perse.",
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
      <PrimaryButton
        label="TERMINA ALLENAMENTO"
        onPress={onComplete}
        disabled={busy}
      />

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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
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

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, spacing } from "../../theme";
import { Body } from "../text";

export function LoadingBlock({ label = "Caricamento…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
      <Body>{label}</Body>
    </View>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retry}>Riprova</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  retry: {
    color: colors.accent,
    fontWeight: "600",
  },
});

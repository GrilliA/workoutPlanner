import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText, Body } from "../text";

export function LoadingBlock({ label = "Caricamento…" }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accentText} />
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
      <AppText style={styles.errorText}>{message}</AppText>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <AppText style={styles.retry}>Riprova</AppText>
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
    borderColor: colors.dangerBorder,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  retry: {
    color: colors.accentText,
    fontWeight: "700",
  },
});

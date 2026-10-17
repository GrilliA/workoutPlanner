import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppText, Body, ErrorBanner, Heading, Meta } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import type { HistoryViewModel } from "../types";

type SessionHistorySectionProps = {
  history: HistoryViewModel;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: () => void;
};

export function SessionHistorySection({
  history,
  loading,
  error,
  onRetry,
  onLoadMore,
}: SessionHistorySectionProps) {
  return (
    <View style={styles.section}>
      <Heading style={styles.title}>Allenamenti</Heading>
      {error ? <ErrorBanner message={error} onRetry={onRetry} /> : null}

      {history.rows.length === 0 && !loading ? (
        <Body>{history.emptyMessage}</Body>
      ) : (
        <View style={styles.list}>
          {history.rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() => router.push(`/session/${row.id}`)}
              style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}
            >
              <View style={styles.historyBody}>
                <AppText tone="heading" style={styles.historyTitle} numberOfLines={1}>
                  {row.title}
                </AppText>
                <Meta>{row.meta}</Meta>
              </View>
              <Meta style={styles.historyVolume}>{row.volumeLabel}</Meta>
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accentText} accessibilityLabel="Caricamento storico" />
      ) : null}

      {history.canLoadMore && !loading ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Carica altre sessioni"
          onPress={onLoadMore}
          style={styles.loadMore}
        >
          <AppText variant="label" tone="accent">
            Carica altri · pagina {history.page} di {history.totalPages || 1}
          </AppText>
        </Pressable>
      ) : null}

      {history.total > 0 ? <Meta>{history.total} allenamenti in tutto</Meta> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  historyRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.7,
  },
  historyBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  historyVolume: {
    fontWeight: "700",
    color: colors.textHeading,
  },
  loadMore: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});

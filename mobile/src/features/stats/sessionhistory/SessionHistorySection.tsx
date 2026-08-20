import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Body, ErrorBanner, Meta, SectionLabel } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
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
      <SectionLabel>STORICO SESSIONI</SectionLabel>
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
              style={styles.historyRow}
            >
              <View style={styles.historyBody}>
                <Body style={styles.historyTitle}>{row.title}</Body>
                <Meta>{row.meta}</Meta>
              </View>
              <Meta style={styles.historyVolume}>{row.volumeLabel}</Meta>
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} accessibilityLabel="Caricamento storico" />
      ) : null}

      {history.canLoadMore && !loading ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Carica altre sessioni"
          onPress={onLoadMore}
          style={styles.loadMore}
        >
          <Meta>CARICA ALTRE · pagina {history.page} di {history.totalPages || 1}</Meta>
        </Pressable>
      ) : null}

      {history.total > 0 ? (
        <Meta>{history.total} sessioni totali</Meta>
      ) : null}
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
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
  },
  historyBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  historyTitle: {
    color: colors.textHeading,
    fontWeight: "700",
  },
  historyVolume: {
    fontWeight: "700",
    color: colors.textHeading,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
});

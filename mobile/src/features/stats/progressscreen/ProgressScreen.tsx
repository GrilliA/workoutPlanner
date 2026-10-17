import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Meta,
  Screen,
  Title,
  useTabBarInset,
} from "../../../components";
import { colors, spacing } from "../../../theme";
import { KpiGrid } from "../kpigrid";
import { PeriodFilter } from "../periodfilter";
import { ExerciseProgressionSection } from "../progression";
import { SessionHistorySection } from "../sessionhistory";
import { useProgressStats } from "../useProgressStats";
import { WeeklyChart } from "../weeklychart";

/** Progressi "Sole": numero grande in indaco, record e serie, storico. */
export function ProgressScreen() {
  const tabBarInset = useTabBarInset();
  const {
    range,
    setRange,
    analytics,
    history,
    loading,
    historyLoading,
    refreshing,
    error,
    historyError,
    reload,
    refresh,
    loadMoreHistory,
  } = useProgressStats("4w");

  if (loading && !analytics && !refreshing) {
    return <LoadingBlock />;
  }

  // Nessuna sessione mai: il taccuino aspetta, niente grafici vuoti.
  const hasNeverTrained = history.total === 0 && !historyLoading && !historyError;
  const isEmpty = analytics !== null && !analytics.hasData && hasNeverTrained;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accentText}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.header}>
          <Title>Progressi</Title>
          {analytics && !isEmpty ? <Meta>{analytics.periodLabel}</Meta> : null}
        </View>

        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

        {isEmpty ? (
          <EmptyState
            mascot="notebook"
            title="Nessun allenamento ancora"
            body="Il taccuino aspetta il tuo primo allenamento."
            actionLabel="Vai alla Home"
            onAction={() => router.push("/(app)")}
          />
        ) : null}

        {analytics && !isEmpty ? (
          <>
            <PeriodFilter value={range} onChange={setRange} />
            <WeeklyChart hero={analytics.hero} model={analytics.weeklyChart} />
            <KpiGrid items={analytics.tiles} />
            <ExerciseProgressionSection options={analytics.progressions} />
          </>
        ) : null}

        {isEmpty ? null : (
          <SessionHistorySection
            history={history}
            loading={historyLoading}
            error={historyError}
            onRetry={reload}
            onLoadMore={loadMoreHistory}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: 2,
    paddingTop: spacing.sm,
  },
});

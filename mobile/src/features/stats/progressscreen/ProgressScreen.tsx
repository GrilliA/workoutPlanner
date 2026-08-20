import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Body,
  ErrorBanner,
  LoadingBlock,
  Meta,
  Screen,
  Title,
} from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { KpiGrid } from "../kpigrid";
import { PeriodFilter } from "../periodfilter";
import { ExerciseProgressionSection } from "../progression";
import { SessionHistorySection } from "../sessionhistory";
import { useProgressStats } from "../useProgressStats";
import { VolumeCard } from "../volumecard";
import { WeeklyChart } from "../weeklychart";

export function ProgressScreen() {
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

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.header}>
          <Title style={styles.title}>Progressi</Title>
          {analytics ? <Meta>{analytics.periodLabel}</Meta> : null}
        </View>

        <PeriodFilter value={range} onChange={setRange} />

        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              reload();
            }}
          />
        ) : null}

        {analytics ? (
          <>
            <View style={styles.insightCard}>
              <Body accessibilityRole="text">{analytics.insight}</Body>
            </View>

            <KpiGrid items={analytics.kpis} />
            <WeeklyChart model={analytics.weeklyChart} />
            <VolumeCard model={analytics.volumeCard} />
            <ExerciseProgressionSection options={analytics.progressions} />
          </>
        ) : null}

        <SessionHistorySection
          history={history}
          loading={historyLoading}
          error={historyError}
          onRetry={reload}
          onLoadMore={loadMoreHistory}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});

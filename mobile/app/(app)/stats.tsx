import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "../../src/api/client";
import { getStats, type UserStats } from "../../src/api";
import {
  Body,
  ErrorBanner,
  ListRow,
  LoadingBlock,
  Screen,
  SectionLabel,
  StatCard,
} from "../../src/components";
import { spacing } from "../../src/theme";

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchId, setFetchId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);

      try {
        const data = await getStats();
        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchId]);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setLoading(true);
              setFetchId((id) => id + 1);
            }}
          />
        ) : null}

        <View style={styles.grid}>
          <StatCard label="Volume (kg)" value={String(stats?.volumeKg ?? "—")} />
          <StatCard
            label="Sessioni"
            value={String(stats?.totalSessions ?? "—")}
          />
          <StatCard label="Streak" value={String(stats?.streakDays ?? "—")} />
          <StatCard
            label="Media vol."
            value={
              stats?.averageSessionVolumeKg != null
                ? String(Math.round(stats.averageSessionVolumeKg))
                : "—"
            }
          />
        </View>

        <SectionLabel>SESSIONI RECENTI</SectionLabel>
        {(stats?.recentSessions ?? []).length === 0 ? (
          <Body>Nessuna sessione nel periodo.</Body>
        ) : (
          (stats?.recentSessions ?? []).map((session) => (
            <ListRow
              key={session.sessionId}
              title={session.workoutName}
              meta={`${session.volumeKg} kg · ${new Date(session.completedAt).toLocaleDateString("it-IT")}`}
              onPress={() => router.push(`/session/${session.sessionId}`)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});

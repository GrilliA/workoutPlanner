import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../src/api/client";
import { getStats, type UserStats } from "../../src/api";
import {
  Body,
  ErrorBanner,
  LoadingBlock,
  Screen,
} from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

export default function StatsScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);

    try {
      setStats(await getStats());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen style={styles.noPad}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <ErrorBanner message={error} onRetry={() => void load()} />
        ) : null}
        <View style={styles.grid}>
          <Stat label="Volume (kg)" value={String(stats?.volumeKg ?? "—")} />
          <Stat label="Sessioni" value={String(stats?.totalSessions ?? "—")} />
          <Stat label="Streak" value={String(stats?.streakDays ?? "—")} />
          <Stat
            label="Media vol."
            value={
              stats?.averageSessionVolumeKg != null
                ? String(Math.round(stats.averageSessionVolumeKg))
                : "—"
            }
          />
        </View>

        <Text style={styles.section}>SESSIONI RECENTI</Text>
        {(stats?.recentSessions ?? []).length === 0 ? (
          <Body>Nessuna sessione nel periodo.</Body>
        ) : (
          (stats?.recentSessions ?? []).map((session) => (
            <Pressable
              key={session.sessionId}
              style={styles.row}
              onPress={() => router.push(`/session/${session.sessionId}`)}
            >
              <Text style={styles.rowTitle}>{session.workoutName}</Text>
              <Text style={styles.rowMeta}>
                {session.volumeKg} kg ·{" "}
                {new Date(session.completedAt).toLocaleDateString("it-IT")}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noPad: { padding: 0 },
  content: { padding: spacing.lg },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stat: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statValue: {
    color: colors.textHeading,
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: { color: colors.text, marginTop: 4 },
  section: {
    color: colors.muted,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.textHeading, fontWeight: "600" },
  rowMeta: { color: colors.text, marginTop: 4 },
});

import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError } from "../../src/api/client";
import {
  getWorkouts,
  getSessions,
  getWorkoutScheduleToday,
  startSession,
  type Workout,
  type WorkoutSchedule,
  type WorkoutSessionSummary,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import {
  Body,
  ErrorBanner,
  LoadingBlock,
  PrimaryButton,
  Screen,
  Title,
} from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

type TodayState = {
  workout: Workout;
  schedule: WorkoutSchedule;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [today, setToday] = useState<TodayState | null>(null);
  const [recent, setRecent] = useState<WorkoutSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setError(null);

    try {
      const [workouts, sessions] = await Promise.all([
        getWorkouts(),
        getSessions(),
      ]);

      setRecent(sessions.slice(0, 5));

      if (workouts.length === 0) {
        setToday(null);
        return;
      }

      const workout = [...workouts].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];
      const schedule = await getWorkoutScheduleToday(workout.id);
      setToday({ workout, schedule });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore caricamento");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onStart = async () => {
    if (!today?.schedule.workoutDay) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const session = await startSession(today.workout.id, {
        workoutDayId: today.schedule.workoutDay.id,
      });
      router.push(`/session/${session.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const sessions = await getSessions();
        const active = sessions.find((session) => session.status === "in_progress");

        if (active) {
          router.push(`/session/${active.id}`);
          return;
        }
      }

      setError(err instanceof ApiError ? err.message : "Impossibile avviare");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const day = today?.schedule.workoutDay;
  const workout = today?.workout;

  return (
    <Screen style={styles.noPad}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Title>Ciao{user?.name ? `, ${user.name}` : ""}</Title>
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setLoading(true);
              void load();
            }}
          />
        ) : null}

        <View style={styles.card}>
          <Text style={styles.eyebrow}>OGGI</Text>
          {day && workout ? (
            <>
              <Text style={styles.cardTitle}>{day.name}</Text>
              <Body>{workout.name}</Body>
              <PrimaryButton
                label={starting ? "Avvio…" : "AVVIA WORKOUT"}
                onPress={() => {
                  void onStart();
                }}
                disabled={starting}
              />
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Riposo</Text>
              <Body>
                {workout
                  ? "Nessun allenamento in programma oggi."
                  : "Crea un programma dal web per iniziare."}
              </Body>
            </>
          )}
        </View>

        <Text style={styles.section}>ULTIMI ALLENAMENTI</Text>
        {recent.length === 0 ? (
          <Body>Nessuna sessione ancora.</Body>
        ) : (
          recent.map((session) => (
            <Pressable
              key={session.id}
              style={styles.row}
              onPress={() => router.push(`/session/${session.id}`)}
            >
              <Text style={styles.rowTitle}>{session.workoutName}</Text>
              <Text style={styles.rowMeta}>
                {session.status} ·{" "}
                {new Date(session.startedAt).toLocaleDateString("it-IT")}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPad: { padding: 0 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 12,
  },
  cardTitle: {
    color: colors.textHeading,
    fontSize: 22,
    fontWeight: "700",
  },
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

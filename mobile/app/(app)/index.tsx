import { router } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
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
  Card,
  ErrorBanner,
  Eyebrow,
  Heading,
  ListRow,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SectionLabel,
  Title,
} from "../../src/components";
import { colors, spacing } from "../../src/theme";

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
  const [fetchId, setFetchId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);

      try {
        const [workouts, sessions] = await Promise.all([
          getWorkouts(),
          getSessions(),
        ]);

        if (cancelled) {
          return;
        }

        setRecent(sessions.slice(0, 5));

        if (workouts.length === 0) {
          setToday(null);
          return;
        }

        const workout = [...workouts].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        )[0];
        const schedule = await getWorkoutScheduleToday(workout.id);

        if (!cancelled) {
          setToday({ workout, schedule });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore caricamento");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchId]);

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
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true);
              setFetchId((id) => id + 1);
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
              setFetchId((id) => id + 1);
            }}
          />
        ) : null}

        <Card highlight>
          <Eyebrow>OGGI</Eyebrow>
          {day && workout ? (
            <>
              <Heading>{day.name}</Heading>
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
              <Heading>Riposo</Heading>
              <Body>
                {workout
                  ? "Nessun allenamento in programma oggi."
                  : "Crea un programma dal web per iniziare."}
              </Body>
            </>
          )}
        </Card>

        <SectionLabel>ULTIMI ALLENAMENTI</SectionLabel>
        {recent.length === 0 ? (
          <Body>Nessuna sessione ancora.</Body>
        ) : (
          recent.map((session) => (
            <ListRow
              key={session.id}
              title={session.workoutName}
              meta={`${session.status} · ${new Date(session.startedAt).toLocaleDateString("it-IT")}`}
              onPress={() => router.push(`/session/${session.id}`)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});

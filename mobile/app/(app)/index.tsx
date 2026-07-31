import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "../../src/api/client";
import {
  getActiveAssignment,
  getWorkouts,
  getSessions,
  getWorkoutDays,
  getWorkoutScheduleToday,
  startSession,
  type ActiveAssignment,
  type Workout,
  type WorkoutDay,
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
  Meta,
  PrimaryButton,
  Screen,
  SectionLabel,
  Title,
} from "../../src/components";
import { colors, radii, spacing } from "../../src/theme";

type StartSelection = {
  workoutId: number;
  workoutDayId: number;
};

/** Home: scegli scheda attiva + giorno, poi avvia. */
export default function HomeScreen() {
  const { user } = useAuth();
  const [activeWorkouts, setActiveWorkouts] = useState<Workout[]>([]);
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [daysByWorkout, setDaysByWorkout] = useState<Record<number, WorkoutDay[]>>(
    {},
  );
  const [selection, setSelection] = useState<StartSelection | null>(null);
  const [scheduledLabel, setScheduledLabel] = useState<string | null>(null);
  const [recent, setRecent] = useState<WorkoutSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [fetchId, setFetchId] = useState(0);
  const skipNextFocusRefresh = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusRefresh.current) {
        skipNextFocusRefresh.current = false;
        return;
      }
      setFetchId((id) => id + 1);
    }, []),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);

      try {
        const [workouts, sessions, activeAssignment] = await Promise.all([
          getWorkouts(),
          getSessions(),
          getActiveAssignment(),
        ]);

        if (cancelled) {
          return;
        }

        setRecent(sessions.slice(0, 5));
        setAssignment(activeAssignment);

        const active = (
          activeAssignment
            ? workouts.filter((workout) => workout.id === activeAssignment.workoutId)
            : []
        ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActiveWorkouts(active);

        if (active.length === 0) {
          setSelection(null);
          setDaysByWorkout({});
          setScheduledLabel(null);
          return;
        }

        const dayEntries = await Promise.all(
          active.map(async (workout) => {
            const days = await getWorkoutDays(workout.id);
            return [workout.id, [...days].sort((a, b) => a.sortOrder - b.sortOrder)] as const;
          }),
        );

        if (cancelled) {
          return;
        }

        const nextDays: Record<number, WorkoutDay[]> = {};
        for (const [workoutId, days] of dayEntries) {
          nextDays[workoutId] = days;
        }
        setDaysByWorkout(nextDays);

        let preferred: StartSelection | null = null;
        let preferredLabel: string | null = null;

        for (const workout of active) {
          const schedule = await getWorkoutScheduleToday(workout.id);
          if (schedule.workoutDay) {
            preferred = {
              workoutId: workout.id,
              workoutDayId: schedule.workoutDay.id,
            };
            preferredLabel = `${workout.name} · ${schedule.workoutDay.name}`;
            break;
          }
        }

        if (cancelled) {
          return;
        }

        if (preferred) {
          setSelection(preferred);
          setScheduledLabel(preferredLabel);
        } else {
          const firstWorkout = active[0]!;
          const firstDay = nextDays[firstWorkout.id]?.[0];
          setSelection(
            firstDay
              ? { workoutId: firstWorkout.id, workoutDayId: firstDay.id }
              : null,
          );
          setScheduledLabel(null);
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

  const selectedWorkout =
    activeWorkouts.find((workout) => workout.id === selection?.workoutId) ??
    null;
  const selectedDays = selectedWorkout
    ? (daysByWorkout[selectedWorkout.id] ?? [])
    : [];
  const selectedDay =
    selectedDays.find((day) => day.id === selection?.workoutDayId) ?? null;

  const onStart = async () => {
    if (!selection) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const session = await startSession(selection.workoutId, {
        workoutDayId: selection.workoutDayId,
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
          {activeWorkouts.length === 0 ? (
            <>
              <Heading>Nessuna scheda attiva</Heading>
              <Body>
                Il tuo coach deve assegnarti una scheda dal pannello web.
              </Body>
              <PrimaryButton
                label="VAI ALLE SCHEDE"
                onPress={() => router.push("/(app)/workouts")}
              />
            </>
          ) : (
            <>
              <Heading>Cosa alleni?</Heading>
              {assignment ? (
                <Meta style={styles.scheduleHint}>
                  Valida fino al {assignment.expiresAt}
                </Meta>
              ) : null}
              {scheduledLabel ? (
                <Meta style={styles.scheduleHint}>
                  In programma: {scheduledLabel}
                </Meta>
              ) : (
                <Meta style={styles.scheduleHint}>
                  Nessun giorno in calendario — scegli tu.
                </Meta>
              )}

              <SectionLabel>SCHEDA</SectionLabel>
              <View style={styles.chipRow}>
                {activeWorkouts.map((workout) => {
                  const selected = workout.id === selection?.workoutId;
                  return (
                    <Pressable
                      key={workout.id}
                      onPress={() => {
                        const days = daysByWorkout[workout.id] ?? [];
                        const firstDay = days[0];
                        setSelection(
                          firstDay
                            ? {
                                workoutId: workout.id,
                                workoutDayId: firstDay.id,
                              }
                            : null,
                        );
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Meta
                        style={selected ? styles.chipLabelSelected : undefined}
                      >
                        {workout.name}
                      </Meta>
                    </Pressable>
                  );
                })}
              </View>

              <SectionLabel>GIORNO</SectionLabel>
              {selectedDays.length === 0 ? (
                <Body>Questa scheda non ha giorni.</Body>
              ) : (
                <View style={styles.chipRow}>
                  {selectedDays.map((day) => {
                    const selected = day.id === selection?.workoutDayId;
                    return (
                      <Pressable
                        key={day.id}
                        onPress={() =>
                          setSelection({
                            workoutId: selectedWorkout!.id,
                            workoutDayId: day.id,
                          })
                        }
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Meta
                          style={
                            selected ? styles.chipLabelSelected : undefined
                          }
                        >
                          {day.name}
                        </Meta>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedWorkout && selectedDay ? (
                <Body style={styles.summary}>
                  {selectedWorkout.name} · {selectedDay.name}
                </Body>
              ) : null}

              <PrimaryButton
                label={starting ? "Avvio…" : "AVVIA WORKOUT"}
                onPress={() => {
                  void onStart();
                }}
                disabled={starting || !selection}
              />
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
  scheduleHint: {
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  chipLabelSelected: {
    color: colors.textHeading,
    fontWeight: "700",
  },
  summary: {
    marginBottom: spacing.sm,
  },
});

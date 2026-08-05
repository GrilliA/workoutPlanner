import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "../../src/api/client";
import {
  getActiveAssignment,
  getSessions,
  getStats,
  getWorkoutDayExercises,
  getWorkoutDays,
  getWorkoutScheduleToday,
  getWorkouts,
  startSession,
  type ActiveAssignment,
  type UserStats,
  type Workout,
  type WorkoutDay,
  type WorkoutSchedule,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import {
  Body,
  Card,
  ErrorBanner,
  Eyebrow,
  Heading,
  LoadingBlock,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
  StatCard,
  Title,
} from "../../src/components";
import {
  RecentRow,
  WeekStrip,
  buildRestWeekStrip,
  mapHomeRecentSessions,
  mapHomeStats,
  mapWeekStrip,
  type HomeRecentSession,
  type HomeStat,
  type WeekStripDay,
} from "../../src/features/home";
import { colors, radii, spacing } from "../../src/theme";
import {
  buildRomeWeekDateKeys,
  formatRomeLongDate,
} from "../../src/utils/romeCalendar";

type StartSelection = {
  workoutId: number;
  workoutDayId: number;
};

const EMPTY_STATS: HomeStat[] = mapHomeStats({
  period: { from: new Date(0), to: new Date(0) },
  volumeKg: 0,
  workoutsPerWeek: 0,
  streakDays: 0,
  recordVolumeKg: 0,
  totalSessions: 0,
  averageSessionVolumeKg: 0,
  dailyBreakdown: [],
  recentSessions: [],
});

/** Home densità mock: header, week strip, today card, KPI, recenti. */
export default function HomeScreen() {
  const { user } = useAuth();
  const [activeWorkouts, setActiveWorkouts] = useState<Workout[]>([]);
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [daysByWorkout, setDaysByWorkout] = useState<Record<number, WorkoutDay[]>>(
    {},
  );
  const [selection, setSelection] = useState<StartSelection | null>(null);
  const [scheduledLabel, setScheduledLabel] = useState<string | null>(null);
  const [weekDays, setWeekDays] = useState<WeekStripDay[]>(() =>
    buildRestWeekStrip(),
  );
  const [homeStats, setHomeStats] = useState<HomeStat[]>(EMPTY_STATS);
  const [recent, setRecent] = useState<HomeRecentSession[]>([]);
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
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
        const [workouts, stats, activeAssignment] = await Promise.all([
          getWorkouts(),
          getStats({ recentLimit: 5 }),
          getActiveAssignment(),
        ]);

        if (cancelled) {
          return;
        }

        applyStats(stats);
        setAssignment(activeAssignment);

        const active = (
          activeAssignment
            ? workouts.filter((workout) => workout.id === activeAssignment.workoutId)
            : workouts.filter(
                (workout) =>
                  workout.isActive &&
                  (workout.createdByUserId == null ||
                    workout.createdByUserId === user?.id),
              )
        ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActiveWorkouts(active);

        if (active.length === 0) {
          setSelection(null);
          setDaysByWorkout({});
          setScheduledLabel(null);
          setWeekDays(buildRestWeekStrip());
          setExerciseCount(null);
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

        const primaryWorkout = active[0]!;
        const weekSchedules = await fetchWeekSchedule(primaryWorkout.id);

        if (cancelled) {
          return;
        }

        setWeekDays(mapWeekStrip(weekSchedules));

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
  }, [fetchId, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadExercises = async () => {
      if (!selection) {
        setExerciseCount(null);
        return;
      }

      try {
        const exercises = await getWorkoutDayExercises(
          selection.workoutId,
          selection.workoutDayId,
        );
        if (!cancelled) {
          setExerciseCount(exercises.length);
        }
      } catch {
        if (!cancelled) {
          setExerciseCount(null);
        }
      }
    };

    void loadExercises();

    return () => {
      cancelled = true;
    };
  }, [selection?.workoutId, selection?.workoutDayId]);

  const applyStats = (stats: UserStats) => {
    setHomeStats(mapHomeStats(stats));
    setRecent(mapHomeRecentSessions(stats, 5));
  };

  const selectedWorkout =
    activeWorkouts.find((workout) => workout.id === selection?.workoutId) ??
    null;
  const selectedDays = selectedWorkout
    ? (daysByWorkout[selectedWorkout.id] ?? [])
    : [];
  const selectedDay =
    selectedDays.find((day) => day.id === selection?.workoutDayId) ?? null;

  const todayTitle = selectedDay?.name ?? "Nessun giorno";
  const todayEyebrow = `OGGI • ${formatRomeLongDate()}`;

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

  const onWeekDayPress = (day: WeekStripDay) => {
    if (!day.workoutDayId || activeWorkouts.length === 0) {
      return;
    }

    const primary = activeWorkouts[0]!;
    const ownsDay = (daysByWorkout[primary.id] ?? []).some(
      (workoutDay) => workoutDay.id === day.workoutDayId,
    );

    if (!ownsDay) {
      return;
    }

    setSelection({
      workoutId: primary.id,
      workoutDayId: day.workoutDayId,
    });
    setScheduledLabel(`${primary.name} · ${day.workoutDayName ?? day.weekdayLabel}`);
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const initials = (user?.name ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Eyebrow>BENTORNATO</Eyebrow>
            <Title style={styles.userName}>
              {user?.name ?? "Atleta"}
            </Title>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.push("/(app)/settings")}
            style={styles.avatar}
          >
            <Meta style={styles.avatarLabel}>{initials}</Meta>
          </Pressable>
        </View>

        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setLoading(true);
              setFetchId((id) => id + 1);
            }}
          />
        ) : null}

        <WeekStrip days={weekDays} onDayPress={onWeekDayPress} />

        <Card highlight style={styles.todayCard}>
          <Eyebrow>{todayEyebrow}</Eyebrow>
          {activeWorkouts.length === 0 ? (
            <>
              <Heading>Nessuna scheda attiva</Heading>
              <Body>
                Crea una scheda dalle Schede, oppure collega un coach dalle
                Impostazioni con il suo codice invito.
              </Body>
              <PrimaryButton
                label="CREA SCHEDA"
                onPress={() => router.push("/workout/new")}
              />
              <SecondaryButton
                label="VAI ALLE SCHEDE"
                onPress={() => router.push("/(app)/workouts")}
              />
            </>
          ) : (
            <>
              <View style={styles.todayTitleRow}>
                <Heading style={styles.todayTitle}>{todayTitle}</Heading>
                {selectedWorkout ? (
                  <View style={styles.badge}>
                    <AppBadgeLabel>{selectedWorkout.name}</AppBadgeLabel>
                  </View>
                ) : null}
              </View>

              {assignment ? (
                <Meta>Valida fino al {assignment.expiresAt}</Meta>
              ) : null}
              {scheduledLabel ? (
                <Meta>In programma: {scheduledLabel}</Meta>
              ) : (
                <Meta>Nessun giorno in calendario — scegli tu.</Meta>
              )}

              <View style={styles.metaRow}>
                {exerciseCount != null ? (
                  <Meta>{exerciseCount} esercizi</Meta>
                ) : null}
              </View>

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
                        setScheduledLabel(null);
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

        <View style={styles.statGrid}>
          {homeStats.map((stat) => (
            <StatCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              unit={stat.unit}
              trend={stat.trend}
              trendAccent={stat.id === "volume" && stat.value !== "—"}
            />
          ))}
        </View>

        <View style={styles.recentHeader}>
          <Heading style={styles.recentTitle}>Ultimi Allenamenti</Heading>
          <Pressable onPress={() => router.push("/(app)/stats")}>
            <Eyebrow>VEDI TUTTI</Eyebrow>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <Body>Nessuna sessione ancora.</Body>
        ) : (
          <View style={styles.recentList}>
            {recent.map((session) => (
              <RecentRow
                key={session.id}
                session={session}
                onPress={() => router.push(`/session/${session.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function AppBadgeLabel({ children }: { children: string }) {
  return (
    <Meta style={styles.badgeLabel} numberOfLines={1}>
      {children}
    </Meta>
  );
}

async function fetchWeekSchedule(workoutId: number): Promise<WorkoutSchedule[]> {
  const dateKeys = buildRomeWeekDateKeys();
  return Promise.all(
    dateKeys.map((date) => getWorkoutScheduleToday(workoutId, date)),
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  headerText: {
    gap: 2,
    flex: 1,
    paddingRight: spacing.md,
  },
  userName: {
    fontSize: 24,
    lineHeight: 30,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    color: colors.textHeading,
    fontWeight: "700",
    fontSize: 12,
  },
  todayCard: {
    gap: spacing.sm,
  },
  todayTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  todayTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 30,
  },
  badge: {
    maxWidth: "40%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  badgeLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
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
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  recentTitle: {
    fontSize: 18,
    lineHeight: 22,
  },
  recentList: {
    gap: spacing.sm,
  },
});

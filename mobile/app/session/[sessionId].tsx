import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  abandonSession,
  completeSession,
  deleteLoggedSet,
  getExercisesByWorkout,
  getSession,
  getWorkout,
  getWorkoutDayExercises,
  logSet,
  patchLoggedSet,
  type Exercise,
  type LoggedSet,
  type WorkoutSessionWithSets,
} from "../../src/api";
import { ApiError } from "../../src/api/client";
import {
  ErrorBanner,
  LoadingBlock,
  Screen,
} from "../../src/components";
import { ExerciseCard } from "../../src/features/session/ExerciseCard";
import { ExercisePager } from "../../src/features/session/ExercisePager";
import { groupSetsByExercise } from "../../src/features/session/groupSetsByExercise";
import { loadPreviousSetsByExercise } from "../../src/features/session/loadPreviousSets";
import {
  formatWeightKg,
  getRestSecForSet,
  getTargetRepsForSet,
  getTargetSetCount,
  isExerciseComplete,
  resolveLogDefaults,
} from "../../src/features/session/logDefaults";
import {
  computeDurationMin,
  computeVolumeKg,
} from "../../src/features/session/celebrationStats";
import { RestTimerCard } from "../../src/features/session/RestTimerCard";
import { SessionActionBar } from "../../src/features/session/SessionActionBar";
import { SessionFocusHeader } from "../../src/features/session/SessionFocusHeader";
import { useRestTimer } from "../../src/features/session/useRestTimer";
import { colors, spacing } from "../../src/theme";

function toLoggingKey(exerciseId: number, setNumber: number): string {
  return `${exerciseId}:${setNumber}`;
}

function formatElapsed(startedAt: Date, nowMs: number): string {
  const totalSec = Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function firstIncompleteIndex(
  exercises: Exercise[],
  setsByExercise: Map<number, LoggedSet[]>,
): number {
  const index = exercises.findIndex(
    (exercise) =>
      !isExerciseComplete(exercise, (setsByExercise.get(exercise.id) ?? []).length),
  );
  return index >= 0 ? index : 0;
}

function mutationErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function sessionProgress(
  exercises: Exercise[],
  setsByExercise: Map<number, LoggedSet[]>,
): number {
  if (exercises.length === 0) {
    return 0;
  }

  const completed = exercises.filter((exercise) =>
    isExerciseComplete(exercise, (setsByExercise.get(exercise.id) ?? []).length),
  ).length;

  return completed / exercises.length;
}

export default function SessionScreen() {
  const { sessionId: rawId } = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Number(rawId);
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
  const [localSets, setLocalSets] = useState<LoggedSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [previousByExercise, setPreviousByExercise] = useState<
    Map<number, LoggedSet[]>
  >(() => new Map());
  const [workoutName, setWorkoutName] = useState("");
  const [defaultRestSec, setDefaultRestSec] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [repsByExercise, setRepsByExercise] = useState<Record<number, string>>(
    {},
  );
  const [weightByExercise, setWeightByExercise] = useState<
    Record<number, string>
  >({});
  const [fetchId, setFetchId] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const loggedKeysRef = useRef(new Set<string>());
  const loggingLockRef = useRef(false);
  const timer = useRestTimer(sessionId);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!Number.isFinite(sessionId)) {
        setError("Sessione non valida");
        setLoading(false);
        return;
      }

      setError(null);

      try {
        const nextSession = await getSession(sessionId);
        const workout = await getWorkout(nextSession.workoutId);
        const [nextExercises, previousMap] = await Promise.all([
          nextSession.workoutDayId
            ? getWorkoutDayExercises(
                nextSession.workoutId,
                nextSession.workoutDayId,
              )
            : getExercisesByWorkout(nextSession.workoutId),
          loadPreviousSetsByExercise(nextSession.workoutId, nextSession.id),
        ]);

        if (cancelled) {
          return;
        }

        const hydratedSets = nextSession.sets;
        loggedKeysRef.current = new Set(
          hydratedSets.map((set) => toLoggingKey(set.exerciseId, set.setNumber)),
        );

        const grouped = groupSetsByExercise(hydratedSets);
        const nextWeights: Record<number, string> = {};
        const nextReps: Record<number, string> = {};

        for (const exercise of nextExercises) {
          const defaults = resolveLogDefaults(
            exercise,
            grouped.get(exercise.id) ?? [],
          );
          nextWeights[exercise.id] = defaults.weight;
          nextReps[exercise.id] = defaults.reps;
        }

        setSession(nextSession);
        setLocalSets(hydratedSets);
        setExercises(nextExercises);
        setPreviousByExercise(previousMap);
        setWorkoutName(workout.name);
        setDefaultRestSec(workout.defaultRestSec);
        setWeightByExercise(nextWeights);
        setRepsByExercise(nextReps);
        setFocusIndex(firstIncompleteIndex(nextExercises, grouped));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore caricamento");
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
  }, [sessionId, fetchId]);

  useEffect(() => {
    if (!session || session.status !== "in_progress") {
      return;
    }

    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session]);

  if (loading) {
    return <LoadingBlock />;
  }

  if (!session) {
    return (
      <Screen>
        <ErrorBanner
          message={error ?? "Sessione non trovata"}
          onRetry={() => {
            setLoading(true);
            setFetchId((id) => id + 1);
          }}
        />
      </Screen>
    );
  }

  const readOnly = session.status !== "in_progress";
  const chromeBusy = finishing || mutating;
  const setsByExercise = groupSetsByExercise(localSets);
  const safeFocusIndex = Math.min(
    focusIndex,
    Math.max(0, exercises.length - 1),
  );
  const focusedExercise = exercises[safeFocusIndex] ?? null;
  const elapsedEndMs = readOnly
    ? (session.completedAt?.getTime() ?? session.startedAt.getTime())
    : nowMs;
  const elapsedLabel = formatElapsed(session.startedAt, elapsedEndMs);
  const statusLabel = readOnly
    ? session.status === "completed"
      ? "Sessione completata"
      : "Sessione abbandonata"
    : "Sessione in corso";
  const progress = sessionProgress(exercises, setsByExercise);

  const suggestedRestSec =
    !readOnly && focusedExercise
      ? getRestSecForSet(
          focusedExercise,
          (setsByExercise.get(focusedExercise.id) ?? []).length + 1,
          defaultRestSec,
        )
      : 0;

  const onLogSet = async (exercise: Exercise) => {
    if (
      session.status !== "in_progress" ||
      loggingLockRef.current ||
      mutating ||
      finishing
    ) {
      return;
    }

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    if (isExerciseComplete(exercise, loggedForExercise.length)) {
      setError("Serie del piano già completate per questo esercizio");
      return;
    }

    const targetSets = getTargetSetCount(exercise);
    const setNumber = loggedForExercise.length + 1;
    if (setNumber > targetSets) {
      setError("Serie del piano già completate per questo esercizio");
      return;
    }

    const repsRaw = repsByExercise[exercise.id]?.trim() ?? "";
    const reps =
      repsRaw === ""
        ? getTargetRepsForSet(exercise, setNumber)
        : Number(repsRaw);
    const weightRaw = weightByExercise[exercise.id]?.trim() ?? "";
    const weightKg = weightRaw === "" ? null : Number(weightRaw);

    if (!Number.isFinite(reps) || reps <= 0) {
      setError("Inserisci le reps");
      return;
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      setError("Peso non valido");
      return;
    }

    const key = toLoggingKey(exercise.id, setNumber);
    if (loggedKeysRef.current.has(key)) {
      return;
    }

    setError(null);
    loggingLockRef.current = true;
    loggedKeysRef.current.add(key);
    setMutating(true);

    try {
      const logged = await logSet(session.id, {
        exerciseId: exercise.id,
        setNumber,
        reps,
        weightKg,
      });

      const nextLoggedCount = loggedForExercise.length + 1;

      setLocalSets((current) => [...current, logged]);

      setWeightByExercise((current) => ({
        ...current,
        [exercise.id]: weightKg === null ? "" : formatWeightKg(weightKg),
      }));
      setRepsByExercise((current) => ({
        ...current,
        [exercise.id]: String(getTargetRepsForSet(exercise, setNumber + 1)),
      }));

      const restSec = getRestSecForSet(exercise, setNumber, defaultRestSec);
      const exerciseDone = isExerciseComplete(exercise, nextLoggedCount);

      if (restSec > 0 && !exerciseDone) {
        void timer.start(restSec, exercise.id).catch(() => {
          // Notifiche possono fallire (permessi): il timer in-app resta comunque.
        });
      }

      if (exerciseDone) {
        const nextIndex = exercises.findIndex(
          (item, index) =>
            index > safeFocusIndex &&
            !isExerciseComplete(
              item,
              (setsByExercise.get(item.id) ?? []).length +
                (item.id === exercise.id ? 1 : 0),
            ),
        );
        if (nextIndex >= 0) {
          setFocusIndex(nextIndex);
        }
      }
    } catch (err) {
      loggedKeysRef.current.delete(key);
      setError(mutationErrorMessage(err, "Salvataggio serie non riuscito"));
    } finally {
      loggingLockRef.current = false;
      setMutating(false);
    }
  };

  const onUndoLastSet = async (exercise: Exercise) => {
    if (session.status !== "in_progress" || mutating || finishing) {
      return;
    }

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    const last = loggedForExercise.at(-1);
    if (!last) {
      return;
    }

    setError(null);
    setMutating(true);

    try {
      await deleteLoggedSet(session.id, last.id);
      timer.cancel();
      loggedKeysRef.current.delete(toLoggingKey(exercise.id, last.setNumber));

      setLocalSets((current) =>
        current.filter(
          (set) =>
            !(
              set.exerciseId === exercise.id && set.setNumber === last.setNumber
            ),
        ),
      );

      setWeightByExercise((current) => ({
        ...current,
        [exercise.id]:
          last.weightKg === null ? "" : formatWeightKg(last.weightKg),
      }));
      setRepsByExercise((current) => ({
        ...current,
        [exercise.id]: String(last.reps),
      }));
    } catch (err) {
      setError(mutationErrorMessage(err, "Annullamento serie non riuscito"));
    } finally {
      setMutating(false);
    }
  };

  const onEditSet = async (
    exercise: Exercise,
    setNumber: number,
    next: { reps: number; weightKg: number | null },
  ) => {
    if (session.status !== "in_progress" || mutating || finishing) {
      return;
    }

    const existing = localSets.find(
      (set) => set.exerciseId === exercise.id && set.setNumber === setNumber,
    );
    if (!existing) {
      return;
    }

    setError(null);
    setMutating(true);

    try {
      const updated = await patchLoggedSet(session.id, existing.id, {
        reps: next.reps,
        weightKg: next.weightKg,
      });

      setLocalSets((current) =>
        current.map((set) => (set.id === updated.id ? updated : set)),
      );

      const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
      const isLast =
        loggedForExercise.length > 0 &&
        loggedForExercise[loggedForExercise.length - 1]?.setNumber === setNumber;

      if (isLast) {
        setWeightByExercise((current) => ({
          ...current,
          [exercise.id]:
            next.weightKg === null ? "" : formatWeightKg(next.weightKg),
        }));
        setRepsByExercise((current) => ({
          ...current,
          [exercise.id]: String(getTargetRepsForSet(exercise, setNumber + 1)),
        }));
      }
    } catch (err) {
      setError(mutationErrorMessage(err, "Modifica serie non riuscita"));
    } finally {
      setMutating(false);
    }
  };

  const finish = async (mode: "complete" | "abandon") => {
    if (finishing || mutating) {
      return;
    }

    setFinishing(true);
    setError(null);

    try {
      timer.cancel();
      if (mode === "complete") {
        const completedAt = new Date();
        const volumeKg = computeVolumeKg(localSets);
        await completeSession(session.id);
        router.replace({
          pathname: "/session/complete",
          params: {
            workoutName,
            volumeKg: String(volumeKg),
            durationMin: String(
              computeDurationMin(session.startedAt, completedAt),
            ),
          },
        } as unknown as Href);
        return;
      }

      await abandonSession(session.id);
      router.replace("/(app)");
    } catch (err) {
      setFinishing(false);
      setError(mutationErrorMessage(err, "Operazione fallita"));
    }
  };

  const onBack = () => {
    if (chromeBusy) {
      return;
    }
    router.back();
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.body}
      >
        <View style={styles.headerPad}>
          <SessionFocusHeader
            workoutName={workoutName}
            exerciseIndex={safeFocusIndex}
            exerciseTotal={exercises.length}
            elapsedLabel={elapsedLabel}
            statusLabel={statusLabel}
            progress={progress}
            onBack={onBack}
          />
        </View>

        {!readOnly ? (
          <RestTimerCard
            status={timer.status}
            remainingSec={timer.remainingSec}
            suggestedSec={suggestedRestSec}
            onSkip={timer.skip}
            onStartSuggested={() => {
              if (!focusedExercise || suggestedRestSec <= 0) {
                return;
              }
              void timer.start(suggestedRestSec, focusedExercise.id).catch(() => {
                // Notifiche opzionali.
              });
            }}
          />
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            !readOnly && styles.contentWithBar,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <ErrorBanner message={error} /> : null}

          {readOnly ? (
            exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                sets={setsByExercise.get(exercise.id) ?? []}
                previousSets={previousByExercise.get(exercise.id) ?? []}
                resting={false}
                readOnly
                weight={weightByExercise[exercise.id] ?? ""}
                reps={repsByExercise[exercise.id] ?? ""}
                exerciseOrdinal={index + 1}
                exerciseTotal={exercises.length}
                onChangeWeight={() => undefined}
                onChangeReps={() => undefined}
                onLog={() => undefined}
                onUndoLast={() => undefined}
                onEditSet={() => undefined}
              />
            ))
          ) : focusedExercise ? (
            <>
              <ExerciseCard
                key={focusedExercise.id}
                exercise={focusedExercise}
                sets={setsByExercise.get(focusedExercise.id) ?? []}
                previousSets={previousByExercise.get(focusedExercise.id) ?? []}
                resting={timer.restingExerciseId === focusedExercise.id}
                readOnly={false}
                busy={mutating}
                focus
                exerciseOrdinal={safeFocusIndex + 1}
                exerciseTotal={exercises.length}
                weight={weightByExercise[focusedExercise.id] ?? ""}
                reps={repsByExercise[focusedExercise.id] ?? ""}
                onChangeWeight={(value) =>
                  setWeightByExercise((current) => ({
                    ...current,
                    [focusedExercise.id]: value,
                  }))
                }
                onChangeReps={(value) =>
                  setRepsByExercise((current) => ({
                    ...current,
                    [focusedExercise.id]: value,
                  }))
                }
                onLog={() => {
                  void onLogSet(focusedExercise);
                }}
                onUndoLast={() => {
                  void onUndoLastSet(focusedExercise);
                }}
                onEditSet={(setNumber, next) => {
                  void onEditSet(focusedExercise, setNumber, next);
                }}
              />

              {exercises.length > 1 ? (
                <ExercisePager
                  index={safeFocusIndex}
                  total={exercises.length}
                  onPrev={() =>
                    setFocusIndex((current) => Math.max(0, current - 1))
                  }
                  onNext={() =>
                    setFocusIndex((current) =>
                      Math.min(exercises.length - 1, current + 1),
                    )
                  }
                />
              ) : null}
            </>
          ) : (
            <ErrorBanner message="Nessun esercizio in questa sessione" />
          )}
        </ScrollView>

        {!readOnly ? (
          <SessionActionBar
            busy={chromeBusy}
            onComplete={() => {
              void finish("complete");
            }}
            onAbandon={() => {
              void finish("abandon");
            }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerPad: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  contentWithBar: {
    paddingBottom: spacing.xl + spacing.lg,
  },
});

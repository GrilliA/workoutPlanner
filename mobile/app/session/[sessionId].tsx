import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  getExercisesByWorkout,
  getSession,
  getWorkout,
  getWorkoutDayExercises,
  hydrateExercisesFromCatalog,
  type Exercise,
  type LoggedSet,
  type WorkoutSessionWithSets,
} from "../../src/api";
import type { SetPosition, SetSummary } from "../../src/api/schemas";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth";
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
  getTargetRirForSet,
  getTargetSetCount,
  isExerciseComplete,
  isValidRir,
  resolveLogDefaults,
} from "../../src/features/session/logDefaults";
import {
  computeDurationMin,
  computeVolumeKg,
} from "../../src/features/session/celebrationStats";
import { RestTimerCard } from "../../src/features/session/RestTimerCard";
import {
  isSameSet,
  recordClose,
  recordSet,
  removeSet,
  type OfflineSessionLog,
} from "../../src/features/session/offlineSessionLog";
import {
  changeOfflineSession,
  getOfflineSession,
  OfflineSessionError,
  openOfflineSession,
  subscribeOfflineSession,
} from "../../src/features/session/offlineSessionStore";
import {
  readSessionBundle,
  saveSessionBundle,
  type SessionBundle,
} from "../../src/features/session/sessionBundle";
import { SessionActionBar } from "../../src/features/session/SessionActionBar";
import {
  SessionFocusHeader,
  type ExerciseSegment,
} from "../../src/features/session/SessionFocusHeader";
import { useRestTimer } from "../../src/features/session/useRestTimer";
import { colors, spacing } from "../../src/theme";

function firstIncompleteIndex(
  exercises: Exercise[],
  setsByExercise: Map<number, SetSummary[]>,
): number {
  const index = exercises.findIndex(
    (exercise) =>
      !isExerciseComplete(exercise, (setsByExercise.get(exercise.id) ?? []).length),
  );
  return index >= 0 ? index : 0;
}

/** API errors in Italian; errors of the log on the phone already are. */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof OfflineSessionError) {
    return err.message;
  }

  return ApiError.messageFrom(err, fallback);
}

/** One segment per exercise for the header bar. */
function exerciseSegments(
  exercises: Exercise[],
  setsByExercise: Map<number, SetSummary[]>,
  focusIndex: number,
): ExerciseSegment[] {
  return exercises.map((exercise, index) => {
    const isDone = isExerciseComplete(
      exercise,
      (setsByExercise.get(exercise.id) ?? []).length,
    );
    if (isDone) {
      return "done";
    }
    if (index === focusIndex) {
      return "current";
    }
    return "todo";
  });
}

export default function SessionScreen() {
  const { sessionId: rawId, rest } = useLocalSearchParams<{
    sessionId: string;
    rest?: string;
  }>();
  const sessionId = Number(rawId);
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
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
  const [rirByExercise, setRirByExercise] = useState<Record<number, string>>(
    {},
  );
  const [fetchId, setFetchId] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const timer = useRestTimer(sessionId);
  const userId = useAuth().user?.id ?? null;
  const offlineSession = useSyncExternalStore(
    subscribeOfflineSession,
    getOfflineSession,
  );
  // The phone holds the sets of this session until TERMINA sends them.
  const offlineLog =
    offlineSession?.log.sessionId === sessionId ? offlineSession.log : null;

  useEffect(() => {
    if (rest !== "skip") {
      return;
    }

    timer.cancel();
    router.setParams({ rest: undefined });
  }, [rest, timer.cancel]);

  useEffect(() => {
    let cancelled = false;

    /**
     * Show a session: its sets come from the log on the phone, which is
     * created from the server data the first time the session is opened.
     */
    const show = async (bundle: SessionBundle, firstShow: boolean) => {
      const log =
        userId === null ? null : await openOfflineSession(userId, bundle.session);

      if (cancelled) {
        return;
      }

      setSession(bundle.session);
      setExercises(bundle.exercises);
      setPreviousByExercise(bundle.previousByExercise);
      setWorkoutName(bundle.workoutName);
      setDefaultRestSec(bundle.defaultRestSec);

      // A refresh from the server after the local open must not reset what
      // the athlete is typing or move the pager.
      if (!firstShow) {
        return;
      }

      const shownSets: SetSummary[] = log?.sets ?? bundle.session.sets;
      const grouped = groupSetsByExercise(shownSets);
      const defaultsByExercise = bundle.exercises.map((exercise) => ({
        exerciseId: exercise.id,
        defaults: resolveLogDefaults(
          exercise,
          grouped.get(exercise.id) ?? [],
          bundle.previousByExercise.get(exercise.id) ?? [],
        ),
      }));

      setWeightByExercise(
        Object.fromEntries(
          defaultsByExercise.map(({ exerciseId, defaults }) => [
            exerciseId,
            defaults.weight,
          ]),
        ),
      );
      setRepsByExercise(
        Object.fromEntries(
          defaultsByExercise.map(({ exerciseId, defaults }) => [
            exerciseId,
            defaults.reps,
          ]),
        ),
      );
      setRirByExercise(
        Object.fromEntries(
          defaultsByExercise.map(({ exerciseId, defaults }) => [
            exerciseId,
            defaults.rir,
          ]),
        ),
      );
      setFocusIndex(firstIncompleteIndex(bundle.exercises, grouped));
    };

    const load = async () => {
      if (!Number.isFinite(sessionId)) {
        setError("Sessione non valida");
        setLoading(false);
        return;
      }

      setError(null);

      const saved = userId === null ? null : await readSessionBundle(userId, sessionId);

      if (cancelled) {
        return;
      }

      try {
        if (saved) {
          await show(saved, true);
          setLoading(false);
        }

        const nextSession = await getSession(sessionId);
        const [workout, nextExercises, previousMap] = await Promise.all([
          getWorkout(nextSession.workoutId),
          (nextSession.workoutDayId
            ? getWorkoutDayExercises(
                nextSession.workoutId,
                nextSession.workoutDayId,
              )
            : getExercisesByWorkout(nextSession.workoutId)
          ).then(hydrateExercisesFromCatalog),
          loadPreviousSetsByExercise(nextSession.workoutId, nextSession.id),
        ]);

        if (cancelled) {
          return;
        }

        const serverBundle: SessionBundle = {
          session: nextSession,
          workoutName: workout.name,
          defaultRestSec: workout.defaultRestSec,
          exercises: nextExercises,
          previousByExercise: previousMap,
        };

        await show(serverBundle, saved === null);

        if (userId !== null) {
          saveSessionBundle(userId, serverBundle);
        }

        const photoUrls = new Set<string>();
        for (const exercise of nextExercises) {
          if (exercise.imageUrl) {
            photoUrls.add(exercise.imageUrl);
          }
          if (exercise.imageUrlEnd) {
            photoUrls.add(exercise.imageUrlEnd);
          }
        }
        void Image.prefetch([...photoUrls], "memory-disk").catch(
          () => undefined,
        );
      } catch (err) {
        // Offline with a saved bundle: stay on the local data, quietly.
        const offline = err instanceof ApiError && err.status === 0;

        if (!cancelled && !(saved && offline)) {
          setError(errorMessage(err, "Errore caricamento"));
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
  }, [sessionId, fetchId, userId]);

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

  const shownSets: SetSummary[] = offlineLog?.sets ?? session.sets;
  const shownStatus = offlineLog?.status ?? session.status;
  const readOnly = shownStatus !== "in_progress";
  const setsByExercise = groupSetsByExercise(shownSets);
  const safeFocusIndex = Math.min(
    focusIndex,
    Math.max(0, exercises.length - 1),
  );
  const focusedExercise = exercises[safeFocusIndex] ?? null;
  const statusLabel = readOnly
    ? shownStatus === "completed"
      ? "Sessione completata"
      : "Sessione abbandonata"
    : "Sessione in corso";
  const segments = exerciseSegments(exercises, setsByExercise, safeFocusIndex);

  const suggestedRestSec =
    !readOnly && focusedExercise
      ? getRestSecForSet(
          focusedExercise,
          (setsByExercise.get(focusedExercise.id) ?? []).length + 1,
          defaultRestSec,
        )
      : 0;

  /** Save an athlete action on the phone; false (and a message) if the disk write failed. */
  const saveOnPhone = (
    change: (log: OfflineSessionLog) => OfflineSessionLog,
    failureMessage: string,
  ): boolean => {
    try {
      changeOfflineSession(change);
      return true;
    } catch {
      setError(failureMessage);
      return false;
    }
  };

  const onLogSet = (exercise: Exercise) => {
    if (readOnly) {
      return;
    }

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    const setNumber = loggedForExercise.length + 1;

    if (isExerciseComplete(exercise, loggedForExercise.length)) {
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
    const rirRaw = rirByExercise[exercise.id]?.trim() ?? "";
    const rir = rirRaw === "" ? null : Number(rirRaw);

    if (!Number.isFinite(reps) || reps <= 0) {
      setError("Inserisci le reps");
      return;
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      setError("Peso non valido");
      return;
    }

    if (rir !== null && !isValidRir(rir)) {
      setError("RIR non valido (da 0 a 10)");
      return;
    }

    const position: SetPosition = { exerciseId: exercise.id, setNumber };
    const values = {
      reps,
      weightKg,
      rir,
      tutSec: null,
      loggedAt: new Date().toISOString(),
    };
    const saved = saveOnPhone(
      (log) => recordSet(log, position, values),
      "Serie non salvata sul telefono. Riprova.",
    );

    if (!saved) {
      return;
    }

    setError(null);
    setWeightByExercise((current) => ({
      ...current,
      [exercise.id]: weightKg === null ? "" : formatWeightKg(weightKg),
    }));
    setRepsByExercise((current) => ({
      ...current,
      [exercise.id]: String(getTargetRepsForSet(exercise, setNumber + 1)),
    }));
    const nextTargetRir = getTargetRirForSet(exercise, setNumber + 1);
    setRirByExercise((current) => ({
      ...current,
      [exercise.id]: nextTargetRir === null ? "" : String(nextTargetRir),
    }));

    const restSec = getRestSecForSet(exercise, setNumber, defaultRestSec);
    const exerciseDone = isExerciseComplete(exercise, setNumber);

    if (restSec > 0 && !exerciseDone) {
      void timer.start(restSec, exercise.id).catch(() => {
        // Notifiche possono fallire (permessi): il timer in-app resta comunque.
      });
    }

    if (!exerciseDone) {
      return;
    }

    const nextIndex = exercises.findIndex((item, index) => {
      const loggedCount = (setsByExercise.get(item.id) ?? []).length;
      const countWithNewSet = item.id === exercise.id ? setNumber : loggedCount;
      return index > safeFocusIndex && !isExerciseComplete(item, countWithNewSet);
    });

    if (nextIndex >= 0) {
      setFocusIndex(nextIndex);
    }
  };

  const onUndoLastSet = (exercise: Exercise) => {
    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    const lastSet = loggedForExercise.at(-1);

    if (readOnly || !lastSet) {
      return;
    }

    const removed = saveOnPhone(
      (log) => removeSet(log, lastSet),
      "Annullamento non salvato sul telefono. Riprova.",
    );

    if (!removed) {
      return;
    }

    setError(null);
    timer.cancel();
    setWeightByExercise((current) => ({
      ...current,
      [exercise.id]:
        lastSet.weightKg === null ? "" : formatWeightKg(lastSet.weightKg),
    }));
    setRepsByExercise((current) => ({
      ...current,
      [exercise.id]: String(lastSet.reps),
    }));
    setRirByExercise((current) => ({
      ...current,
      [exercise.id]: lastSet.rir === null ? "" : String(lastSet.rir),
    }));
  };

  const onEditSet = (
    exercise: Exercise,
    setNumber: number,
    next: { reps: number; weightKg: number | null; rir: number | null },
  ) => {
    const position: SetPosition = { exerciseId: exercise.id, setNumber };
    const editedSet = offlineLog?.sets.find((set) => isSameSet(set, position));

    if (readOnly || !editedSet) {
      return;
    }

    const changedValues = { ...editedSet, ...next };
    const saved = saveOnPhone(
      (log) => recordSet(log, position, changedValues),
      "Modifica non salvata sul telefono. Riprova.",
    );

    if (!saved) {
      return;
    }

    setError(null);

    const loggedForExercise = setsByExercise.get(exercise.id) ?? [];
    const isLastSet = loggedForExercise.at(-1)?.setNumber === setNumber;

    if (!isLastSet) {
      return;
    }

    setWeightByExercise((current) => ({
      ...current,
      [exercise.id]: next.weightKg === null ? "" : formatWeightKg(next.weightKg),
    }));
    setRepsByExercise((current) => ({
      ...current,
      [exercise.id]: String(getTargetRepsForSet(exercise, setNumber + 1)),
    }));
    const nextTargetRir = getTargetRirForSet(exercise, setNumber + 1);
    setRirByExercise((current) => ({
      ...current,
      [exercise.id]: nextTargetRir === null ? "" : String(nextTargetRir),
    }));
  };

  /** TERMINA works without network: the close waits on the phone and is sent later. */
  const finish = () => {
    if (readOnly) {
      return;
    }

    const completedAt = new Date();
    const closed = saveOnPhone(
      (log) => recordClose(log, "completed", completedAt.toISOString()),
      "Fine sessione non salvata sul telefono. Riprova.",
    );

    if (!closed) {
      return;
    }

    timer.cancel();
    router.replace({
      pathname: "/session/complete",
      params: {
        workoutName,
        volumeKg: String(computeVolumeKg(shownSets)),
        durationMin: String(computeDurationMin(session.startedAt, completedAt)),
        setCount: String(shownSets.length),
      },
    } as unknown as Href);
  };

  const onBack = () => {
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
            startedAt={session.startedAt}
            endedAt={readOnly ? (session.completedAt ?? session.startedAt) : null}
            statusLabel={statusLabel}
            segments={segments}
            onBack={onBack}
          />
        </View>

        {!readOnly ? (
          <RestTimerCard
            status={timer.status}
            remainingSec={timer.remainingSec}
            totalSec={timer.totalSec}
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
                rir={rirByExercise[exercise.id] ?? ""}
                exerciseOrdinal={index + 1}
                exerciseTotal={exercises.length}
                onChangeWeight={() => undefined}
                onChangeReps={() => undefined}
                onChangeRir={() => undefined}
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
                focus
                exerciseOrdinal={safeFocusIndex + 1}
                exerciseTotal={exercises.length}
                weight={weightByExercise[focusedExercise.id] ?? ""}
                reps={repsByExercise[focusedExercise.id] ?? ""}
                rir={rirByExercise[focusedExercise.id] ?? ""}
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
                onChangeRir={(value) =>
                  setRirByExercise((current) => ({
                    ...current,
                    [focusedExercise.id]: value,
                  }))
                }
                onLog={() => onLogSet(focusedExercise)}
                onUndoLast={() => onUndoLastSet(focusedExercise)}
                onEditSet={(setNumber, next) =>
                  onEditSet(focusedExercise, setNumber, next)
                }
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
          <SessionActionBar busy={false} onComplete={finish} />
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

import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ApiError } from "../../src/api/client";
import {
  createWorkoutDayExercise,
  deleteExercise,
  getWorkout,
  getWorkoutDayExercises,
  getWorkoutDays,
  setWorkoutDayWeekdays,
  updateExercise,
  updateWorkout,
  updateWorkoutDay,
  type Exercise,
  type WorkoutDay,
  type WorkoutDetail,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import {
  AppText,
  BackHeader,
  Body,
  Card,
  ErrorBanner,
  Field,
  Heading,
  LoadingBlock,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
} from "../../src/components";
import {
  SetPrescriptionEditor,
  WeekdayChips,
  prescriptionsFromServer,
  prescriptionsFromUniform,
  toSetPrescriptions,
  validatePrescriptionDrafts,
  type DraftPrescription,
} from "../../src/features/workoutprogram";
import { colors, spacing } from "../../src/theme";

const isSelfProgram = (workout: WorkoutDetail, userId: number) =>
  workout.createdByUserId == null || workout.createdByUserId === userId;

function prescriptionMeta(exercise: Exercise): string {
  const count =
    exercise.setPrescriptions.length > 0
      ? exercise.setPrescriptions.length
      : (exercise.sets ?? 0);
  const firstReps =
    exercise.setPrescriptions[0]?.reps ?? exercise.reps ?? null;
  if (count <= 0) {
    return "Senza serie";
  }
  return firstReps != null
    ? `${count} serie · ${firstReps} reps`
    : `${count} serie`;
}

export default function EditWorkoutScreen() {
  const { workoutId: rawId } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(rawId);
  const { user } = useAuth();

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState("");
  const [dayName, setDayName] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newPrescriptions, setNewPrescriptions] = useState<DraftPrescription[]>(
    () => prescriptionsFromUniform(3, 10, 90),
  );
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editPrescriptions, setEditPrescriptions] = useState<
    DraftPrescription[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fetchId, setFetchId] = useState(0);

  const canEdit =
    workout != null && user != null && isSelfProgram(workout, user.id);

  const loadExercises = useCallback(
    async (dayId: number) => {
      const next = await getWorkoutDayExercises(workoutId, dayId);
      setExercises(next);
    },
    [workoutId],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!Number.isFinite(workoutId)) {
        setError("Scheda non valida");
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const [detail, nextDays] = await Promise.all([
          getWorkout(workoutId),
          getWorkoutDays(workoutId),
        ]);
        if (cancelled) {
          return;
        }

        const sortedDays = [...nextDays].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );
        setWorkout(detail);
        setDays(sortedDays);
        setName(detail.name);

        const firstDay = sortedDays[0] ?? null;
        setSelectedDayId(firstDay?.id ?? null);
        setDayName(firstDay?.name ?? "");
        setWeekdays(firstDay?.weekdays ?? []);

        if (firstDay) {
          await loadExercises(firstDay.id);
        } else {
          setExercises([]);
        }
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
  }, [workoutId, fetchId, loadExercises]);

  const onSelectDay = (day: WorkoutDay) => {
    setSelectedDayId(day.id);
    setDayName(day.name);
    setWeekdays(day.weekdays);
    setEditingExerciseId(null);
    setError(null);
    void (async () => {
      try {
        await loadExercises(day.id);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Errore caricamento esercizi",
        );
      }
    })();
  };

  const onSaveWorkoutName = async () => {
    if (!canEdit || !name.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateWorkout(workoutId, { name: name.trim() });
      setWorkout((current) =>
        current ? { ...current, name: updated.name } : current,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvataggio fallito");
    } finally {
      setBusy(false);
    }
  };

  const onSaveDay = async () => {
    if (!canEdit || selectedDayId == null || !dayName.trim()) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateWorkoutDay(workoutId, selectedDayId, {
        name: dayName.trim(),
      });
      await setWorkoutDayWeekdays(workoutId, selectedDayId, {
        weekdays: weekdays as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
      });
      setDays((current) =>
        current.map((day) =>
          day.id === selectedDayId
            ? { ...day, name: updated.name, weekdays: weekdays as WorkoutDay["weekdays"] }
            : day,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvataggio giorno fallito");
    } finally {
      setBusy(false);
    }
  };

  const onAddExercise = async () => {
    if (!canEdit || selectedDayId == null) {
      return;
    }
    const trimmed = newExerciseName.trim();
    if (!trimmed) {
      setError("Nome esercizio obbligatorio");
      return;
    }
    const validation = validatePrescriptionDrafts(newPrescriptions);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createWorkoutDayExercise(workoutId, selectedDayId, {
        name: trimmed,
        setPrescriptions: toSetPrescriptions(newPrescriptions),
      });
      setNewExerciseName("");
      setNewPrescriptions(prescriptionsFromUniform(3, 10, 90));
      await loadExercises(selectedDayId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aggiunta fallita");
    } finally {
      setBusy(false);
    }
  };

  const startEditExercise = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setEditName(exercise.name);
    setEditPrescriptions(
      prescriptionsFromServer(
        exercise.setPrescriptions,
        workout?.defaultRestSec ?? 90,
      ),
    );
  };

  const onSaveExercise = async () => {
    if (!canEdit || editingExerciseId == null) {
      return;
    }
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Nome esercizio obbligatorio");
      return;
    }
    const validation = validatePrescriptionDrafts(editPrescriptions);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateExercise(editingExerciseId, {
        name: trimmed,
        setPrescriptions: toSetPrescriptions(editPrescriptions),
      });
      setEditingExerciseId(null);
      if (selectedDayId != null) {
        await loadExercises(selectedDayId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Modifica fallita");
    } finally {
      setBusy(false);
    }
  };

  const onDeleteExercise = (exercise: Exercise) => {
    if (!canEdit) {
      return;
    }
    Alert.alert(
      "Elimina esercizio",
      `Rimuovere “${exercise.name}” da questo giorno?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                await deleteExercise(exercise.id);
                if (editingExerciseId === exercise.id) {
                  setEditingExerciseId(null);
                }
                if (selectedDayId != null) {
                  await loadExercises(selectedDayId);
                }
              } catch (err) {
                setError(
                  err instanceof ApiError ? err.message : "Eliminazione fallita",
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingBlock />;
  }

  if (!workout) {
    return (
      <Screen>
        <BackHeader onPress={() => router.back()} />
        <ErrorBanner
          message={error ?? "Scheda non trovata"}
          onRetry={() => {
            setLoading(true);
            setFetchId((id) => id + 1);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <BackHeader onPress={() => router.back()} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Heading>{canEdit ? "Modifica scheda" : "Dettaglio scheda"}</Heading>
          {!canEdit ? (
            <Body>
              Scheda del coach: sola lettura. Puoi usarla dalla Home.
            </Body>
          ) : null}

          {error ? <ErrorBanner message={error} /> : null}

          <SectionLabel>NOME SCHEDA</SectionLabel>
          <Field
            value={name}
            onChangeText={setName}
            editable={canEdit && !busy}
            placeholder="Nome scheda"
          />
          {canEdit ? (
            <SecondaryButton
              label={busy ? "Salvataggio…" : "Salva nome"}
              onPress={() => void onSaveWorkoutName()}
              disabled={busy || !name.trim()}
            />
          ) : null}

          <SectionLabel>GIORNI</SectionLabel>
          {days.length === 0 ? (
            <Body>Nessun giorno in questa scheda.</Body>
          ) : (
            <View style={styles.chipRow}>
              {days.map((day) => {
                const selected = day.id === selectedDayId;
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => onSelectDay(day)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Meta style={selected ? styles.chipLabelSelected : undefined}>
                      {day.name}
                    </Meta>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selectedDayId != null ? (
            <>
              <Field
                value={dayName}
                onChangeText={setDayName}
                editable={canEdit && !busy}
                placeholder="Nome giorno"
              />
              <Meta>Giorni in calendario</Meta>
              <WeekdayChips
                selected={weekdays}
                onChange={setWeekdays}
                disabled={!canEdit || busy}
              />
              {canEdit ? (
                <SecondaryButton
                  label={busy ? "Salvataggio…" : "Salva giorno"}
                  onPress={() => void onSaveDay()}
                  disabled={busy || !dayName.trim()}
                />
              ) : null}

              <SectionLabel>ESERCIZI</SectionLabel>
              {exercises.length === 0 ? (
                <Body>Nessun esercizio in questo giorno.</Body>
              ) : (
                exercises.map((exercise) => {
                  const editing = editingExerciseId === exercise.id;
                  return (
                    <Card key={exercise.id} style={styles.exerciseCard}>
                      {editing ? (
                        <View style={styles.editBlock}>
                          <Field
                            value={editName}
                            onChangeText={setEditName}
                            editable={!busy}
                            placeholder="Nome esercizio"
                          />
                          <SetPrescriptionEditor
                            prescriptions={editPrescriptions}
                            onChange={setEditPrescriptions}
                            disabled={busy}
                          />
                          <PrimaryButton
                            label="Salva esercizio"
                            onPress={() => void onSaveExercise()}
                            disabled={busy}
                          />
                          <SecondaryButton
                            label="Annulla"
                            onPress={() => setEditingExerciseId(null)}
                            disabled={busy}
                          />
                        </View>
                      ) : (
                        <>
                          <AppText tone="heading" style={styles.exerciseTitle}>
                            {exercise.name}
                          </AppText>
                          <Meta>{prescriptionMeta(exercise)}</Meta>
                          {canEdit ? (
                            <View style={styles.exerciseActions}>
                              <SecondaryButton
                                label="Modifica"
                                onPress={() => startEditExercise(exercise)}
                                disabled={busy}
                              />
                              <SecondaryButton
                                label="Elimina"
                                onPress={() => onDeleteExercise(exercise)}
                                disabled={busy}
                              />
                            </View>
                          ) : null}
                        </>
                      )}
                    </Card>
                  );
                })
              )}

              {canEdit ? (
                <View style={styles.addBlock}>
                  <SectionLabel>AGGIUNGI ESERCIZIO</SectionLabel>
                  <Field
                    value={newExerciseName}
                    onChangeText={setNewExerciseName}
                    editable={!busy}
                    placeholder="Nome esercizio"
                  />
                  <SetPrescriptionEditor
                    prescriptions={newPrescriptions}
                    onChange={setNewPrescriptions}
                    disabled={busy}
                  />
                  <PrimaryButton
                    label={busy ? "Aggiunta…" : "Aggiungi esercizio"}
                    onPress={() => void onAddExercise()}
                    disabled={busy || !newExerciseName.trim()}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  chipLabelSelected: {
    color: colors.accent,
    fontWeight: "700",
  },
  exerciseCard: {
    gap: spacing.xs,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseActions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  editBlock: {
    gap: spacing.sm,
  },
  addBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  createWorkoutDay,
  createWorkoutDayExercise,
  deleteExercise,
  deleteWorkoutDay,
  getWorkout,
  getWorkoutDayExercises,
  getWorkoutDays,
  setWorkoutDayWeekdays,
  updateExercise,
  updateWorkout,
  updateWorkoutDay,
  type Exercise,
  type WorkoutDay,
} from "../../src/api";
import { ApiError } from "../../src/api/client";
import {
  BackHeader,
  Body,
  ErrorBanner,
  Field,
  LoadingBlock,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
  Title,
} from "../../src/components";
import {
  SetPrescriptionEditor,
  WeekdayChips,
  newPrescription,
  prescriptionsFromServer,
  toSetPrescriptions,
  validatePrescriptionDrafts,
  type DraftPrescription,
} from "../../src/features/workoutprogram";
import { colors, radii, spacing } from "../../src/theme";
import { animateLayoutSoft } from "../../src/utils/layoutMotion";

type DraftExercise = {
  key: string;
  serverId: number | null;
  name: string;
  prescriptions: DraftPrescription[];
  catalogId: string | null;
};

const newDraft = (): DraftExercise => ({
  key: `new-${Date.now()}-${Math.random()}`,
  serverId: null,
  name: "",
  prescriptions: [
    newPrescription("8", 90),
    newPrescription("8", 90),
    newPrescription("8", 90),
  ],
  catalogId: null,
});

const toDraft = (exercise: Exercise): DraftExercise => {
  const prescriptions =
    exercise.setPrescriptions.length > 0
      ? prescriptionsFromServer(exercise.setPrescriptions)
      : [
          newPrescription(
            String(exercise.reps ?? 8),
            90,
          ),
        ];

  // If only legacy sets count exists, expand uniform reps.
  if (
    exercise.setPrescriptions.length === 0 &&
    exercise.sets != null &&
    exercise.sets > 1
  ) {
    const reps = String(exercise.reps ?? 8);
    return {
      key: `ex-${exercise.id}`,
      serverId: exercise.id,
      name: exercise.name,
      prescriptions: Array.from({ length: exercise.sets }, () =>
        newPrescription(reps, 90),
      ),
      catalogId: exercise.catalogId ?? null,
    };
  }

  return {
    key: `ex-${exercise.id}`,
    serverId: exercise.id,
    name: exercise.name,
    prescriptions,
    catalogId: exercise.catalogId ?? null,
  };
};

/** Modifica esercizi di un giorno (MVP). Multi-giorno: selettore semplice. */
export default function EditWorkoutScreen() {
  const { workoutId: rawId } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(rawId);

  const [workoutName, setWorkoutName] = useState("");
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [dayName, setDayName] = useState("");
  const [dayWeekdays, setDayWeekdays] = useState<number[]>([]);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [initialServerIds, setInitialServerIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fetchId, setFetchId] = useState(0);

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
        const [workout, workoutDays] = await Promise.all([
          getWorkout(workoutId),
          getWorkoutDays(workoutId),
        ]);

        if (cancelled) {
          return;
        }

        const sortedDays = [...workoutDays].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        );

        setWorkoutName(workout.name);
        setDays(sortedDays);

        if (sortedDays.length === 0) {
          setSelectedDayId(null);
          setDayName("");
          setDayWeekdays([]);
          setExercises([newDraft()]);
          setInitialServerIds([]);
          return;
        }

        const day = sortedDays[0]!;
        const dayExercises = await getWorkoutDayExercises(workoutId, day.id);

        if (cancelled) {
          return;
        }

        setSelectedDayId(day.id);
        setDayName(day.name);
        setDayWeekdays(day.weekdays);
        setExercises(
          dayExercises.length > 0 ? dayExercises.map(toDraft) : [newDraft()],
        );
        setInitialServerIds(dayExercises.map((item) => item.id));
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
  }, [workoutId, fetchId]);

  const selectDay = async (dayId: number) => {
    if (dayId === selectedDayId || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const day = days.find((entry) => entry.id === dayId);
      if (!day) {
        return;
      }

      const dayExercises = await getWorkoutDayExercises(workoutId, dayId);
      setSelectedDayId(dayId);
      setDayName(day.name);
      setDayWeekdays(day.weekdays);
      setExercises(
        dayExercises.length > 0 ? dayExercises.map(toDraft) : [newDraft()],
      );
      setInitialServerIds(dayExercises.map((item) => item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore caricamento giorno");
    } finally {
      setBusy(false);
    }
  };

  const addDay = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await createWorkoutDay(workoutId, {
        name: `Giorno ${days.length + 1}`,
        sortOrder: days.length,
        weekdays: [],
      });
      animateLayoutSoft();
      setDays((current) =>
        [...current, created].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setSelectedDayId(created.id);
      setDayName(created.name);
      setDayWeekdays(created.weekdays);
      setExercises([newDraft()]);
      setInitialServerIds([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossibile aggiungere il giorno");
    } finally {
      setBusy(false);
    }
  };

  const removeActiveDay = async () => {
    if (busy || selectedDayId === null || days.length <= 1) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await deleteWorkoutDay(workoutId, selectedDayId);
      const remaining = days.filter((day) => day.id !== selectedDayId);
      const next = remaining[0]!;
      const dayExercises = await getWorkoutDayExercises(workoutId, next.id);
      animateLayoutSoft();
      setDays(remaining);
      setSelectedDayId(next.id);
      setDayName(next.name);
      setDayWeekdays(next.weekdays);
      setExercises(
        dayExercises.length > 0 ? dayExercises.map(toDraft) : [newDraft()],
      );
      setInitialServerIds(dayExercises.map((item) => item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossibile rimuovere il giorno");
    } finally {
      setBusy(false);
    }
  };

  const updateDraft = (
    key: string,
    patch: Partial<Omit<DraftExercise, "key" | "serverId">>,
  ) => {
    setExercises((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeDraft = (key: string) => {
    animateLayoutSoft();
    setExercises((current) =>
      current.length <= 1 ? current : current.filter((item) => item.key !== key),
    );
  };

  const onSave = async () => {
    if (selectedDayId === null) {
      setError("Nessun giorno da modificare");
      return;
    }

    const trimmedWorkoutName = workoutName.trim();
    const trimmedDayName = dayName.trim();

    if (!trimmedWorkoutName) {
      setError("Inserisci il nome della scheda");
      return;
    }

    if (!trimmedDayName) {
      setError("Inserisci il nome del giorno");
      return;
    }

    if (dayWeekdays.length === 0) {
      setError("Scegli almeno un giorno della settimana per questo giorno di scheda");
      return;
    }

    const parsed = exercises.map((item) => ({
      ...item,
      name: item.name.trim(),
    }));

    if (parsed.some((item) => !item.name)) {
      setError("Ogni esercizio deve avere un nome");
      return;
    }

    for (const item of parsed) {
      const prescriptionError = validatePrescriptionDrafts(item.prescriptions);
      if (prescriptionError) {
        setError(`${item.name}: ${prescriptionError}`);
        return;
      }
    }

    setBusy(true);
    setError(null);

    try {
      await updateWorkout(workoutId, { name: trimmedWorkoutName });

      const currentDay = days.find((day) => day.id === selectedDayId);
      if (currentDay && currentDay.name !== trimmedDayName) {
        await updateWorkoutDay(workoutId, selectedDayId, {
          name: trimmedDayName,
        });
      }

      const sortedCurrent = [...(currentDay?.weekdays ?? [])].sort((a, b) => a - b);
      const sortedNext = [...dayWeekdays].sort((a, b) => a - b);
      const weekdaysChanged =
        sortedCurrent.length !== sortedNext.length ||
        sortedCurrent.some((value, index) => value !== sortedNext[index]);

      if (weekdaysChanged) {
        await setWorkoutDayWeekdays(workoutId, selectedDayId, {
          weekdays: sortedNext as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
        });
      }

      const keptIds = new Set(
        parsed
          .map((item) => item.serverId)
          .filter((id): id is number => id !== null),
      );

      for (const serverId of initialServerIds) {
        if (!keptIds.has(serverId)) {
          await deleteExercise(serverId);
        }
      }

      for (const item of parsed) {
        const payload = {
          name: item.name,
          setPrescriptions: toSetPrescriptions(item.prescriptions),
          catalogId: item.catalogId,
        };

        if (item.serverId !== null) {
          await updateExercise(item.serverId, payload);
        } else {
          await createWorkoutDayExercise(workoutId, selectedDayId, payload);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvataggio fallito");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.replace("/workouts");
  };

  if (loading) {
    return <LoadingBlock />;
  }

  if (!Number.isFinite(workoutId) || (days.length === 0 && error)) {
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
      <BackHeader onPress={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Title>MODIFICA SCHEDA</Title>
          <Body>
            Più giorni (Petto, Gambe, …). Per ogni esercizio imposta reps e
            recupero diversi per serie.
          </Body>
          {error ? <ErrorBanner message={error} /> : null}

          <SectionLabel>SCHEDA</SectionLabel>
          <Field
            placeholder="Nome scheda"
            value={workoutName}
            onChangeText={setWorkoutName}
            autoCapitalize="words"
          />

          <SectionLabel>GIORNI DELLA SCHEDA</SectionLabel>
          <View style={styles.dayRow}>
            {days.map((day) => {
              const selected = day.id === selectedDayId;
              return (
                <Pressable
                  key={day.id}
                  onPress={() => {
                    void selectDay(day.id);
                  }}
                  style={[styles.dayChip, selected && styles.dayChipSelected]}
                >
                  <Meta style={selected ? styles.dayChipLabelSelected : undefined}>
                    {day.name}
                  </Meta>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.dayActions}>
            <SecondaryButton
              label="Aggiungi giorno"
              onPress={() => {
                void addDay();
              }}
              disabled={busy}
            />
            {days.length > 1 ? (
              <Pressable
                onPress={() => {
                  void removeActiveDay();
                }}
                disabled={busy}
              >
                <Meta style={styles.remove}>Rimuovi giorno corrente</Meta>
              </Pressable>
            ) : null}
          </View>

          <SectionLabel>GIORNO CORRENTE</SectionLabel>
          <Field
            placeholder="Nome giorno (es. Petto / Bicipiti)"
            value={dayName}
            onChangeText={setDayName}
            autoCapitalize="words"
          />
          <Meta style={styles.fieldLabel}>Giorni in settimana</Meta>
          <WeekdayChips
            selected={dayWeekdays}
            onChange={setDayWeekdays}
            disabled={busy}
          />

          <SectionLabel>ESERCIZI</SectionLabel>
          {exercises.map((item) => (
            <View key={item.key} style={styles.exerciseBlock}>
              <Field
                placeholder="Nome esercizio"
                value={item.name}
                onChangeText={(value) => updateDraft(item.key, { name: value })}
                autoCapitalize="words"
              />
              <SetPrescriptionEditor
                prescriptions={item.prescriptions}
                onChange={(prescriptions) =>
                  updateDraft(item.key, { prescriptions })
                }
                disabled={busy}
              />
              {exercises.length > 1 ? (
                <Pressable onPress={() => removeDraft(item.key)}>
                  <Meta style={styles.remove}>Rimuovi</Meta>
                </Pressable>
              ) : null}
            </View>
          ))}

          <SecondaryButton
            label="Aggiungi esercizio"
            onPress={() => {
              animateLayoutSoft();
              setExercises((current) => [...current, newDraft()]);
            }}
            disabled={busy}
          />
          <PrimaryButton
            label={busy ? "Salvataggio…" : "SALVA"}
            onPress={() => {
              void onSave();
            }}
            disabled={busy || selectedDayId === null}
          />
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
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  dayChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  dayChipLabelSelected: {
    color: colors.accent,
    fontWeight: "700",
  },
  dayActions: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  exerciseBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  fieldLabel: {
    marginBottom: 4,
    fontWeight: "600",
  },
  fieldInHalf: { marginBottom: 0 },
  remove: { color: colors.danger, marginTop: spacing.xs },
});

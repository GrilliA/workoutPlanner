import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ApiError } from "../../src/api/client";
import { saveWorkoutProgram } from "../../src/api";
import {
  BackHeader,
  Body,
  ErrorBanner,
  Field,
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
  toSetPrescriptions,
  validatePrescriptionDrafts,
  type DraftPrescription,
} from "../../src/features/workoutprogram";
import { colors, radii, spacing } from "../../src/theme";
import { animateLayoutSoft } from "../../src/utils/layoutMotion";

type DraftExercise = {
  key: string;
  name: string;
  prescriptions: DraftPrescription[];
};

type DraftDay = {
  key: string;
  name: string;
  weekdays: number[];
  exercises: DraftExercise[];
};

const newExercise = (): DraftExercise => ({
  key: `ex-${Date.now()}-${Math.random()}`,
  name: "",
  prescriptions: [
    newPrescription("10", 90),
    newPrescription("10", 90),
    newPrescription("10", 90),
  ],
});

const dayLetter = (index: number): string =>
  String.fromCharCode(65 + Math.min(index, 25));

const newDay = (index: number): DraftDay => ({
  key: `day-${Date.now()}-${Math.random()}`,
  name: index === 0 ? "Petto / Bicipiti" : `Giorno ${dayLetter(index)}`,
  weekdays: [],
  exercises: [newExercise()],
});

/** Crea scheda multi-giorno: giorni + esercizi con serie variabili + recupero. */
export default function NewWorkoutScreen() {
  const initialDay = newDay(0);
  const [name, setName] = useState("");
  const [days, setDays] = useState<DraftDay[]>([initialDay]);
  const [activeDayKey, setActiveDayKey] = useState(initialDay.key);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeDay = days.find((day) => day.key === activeDayKey) ?? days[0]!;

  const patchActiveDay = (patch: Partial<Omit<DraftDay, "key">>) => {
    setDays((current) =>
      current.map((day) =>
        day.key === activeDay.key ? { ...day, ...patch } : day,
      ),
    );
  };

  const updateExercise = (
    key: string,
    patch: Partial<Omit<DraftExercise, "key">>,
  ) => {
    patchActiveDay({
      exercises: activeDay.exercises.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    });
  };

  const removeExercise = (key: string) => {
    if (activeDay.exercises.length <= 1) {
      return;
    }
    animateLayoutSoft();
    patchActiveDay({
      exercises: activeDay.exercises.filter((item) => item.key !== key),
    });
  };

  const addDay = () => {
    animateLayoutSoft();
    const day = newDay(days.length);
    setDays((current) => [...current, day]);
    setActiveDayKey(day.key);
  };

  const removeActiveDay = () => {
    if (days.length <= 1) {
      return;
    }
    animateLayoutSoft();
    const remaining = days.filter((day) => day.key !== activeDay.key);
    setDays(remaining);
    setActiveDayKey(remaining[0]!.key);
  };

  const onSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Inserisci il nome della scheda");
      return;
    }

    for (const day of days) {
      if (!day.name.trim()) {
        setError("Ogni giorno deve avere un nome (es. Petto, Gambe)");
        return;
      }
      if (day.weekdays.length === 0) {
        setError(`Scegli almeno un giorno della settimana per “${day.name.trim()}”`);
        return;
      }
      if (day.exercises.some((item) => !item.name.trim())) {
        setError(`Ogni esercizio in “${day.name.trim()}” deve avere un nome`);
        return;
      }

      for (const item of day.exercises) {
        const prescriptionError = validatePrescriptionDrafts(item.prescriptions);
        if (prescriptionError) {
          setError(`${item.name.trim() || "Esercizio"}: ${prescriptionError}`);
          return;
        }
      }
    }

    const weekdayOwner = new Map<number, string>();
    for (const day of days) {
      for (const weekday of day.weekdays) {
        const owner = weekdayOwner.get(weekday);
        if (owner) {
          setError(
            `Lo stesso giorno della settimana non può essere in due giorni della scheda (${owner} e ${day.name.trim()})`,
          );
          return;
        }
        weekdayOwner.set(weekday, day.name.trim());
      }
    }

    setBusy(true);
    setError(null);

    try {
      await saveWorkoutProgram({
        name: trimmedName,
        defaultRestSec: 90,
        days: days.map((day, index) => ({
          name: day.name.trim(),
          sortOrder: index,
          weekdays: day.weekdays as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
          exercises: day.exercises.map((item) => ({
            name: item.name.trim(),
            setPrescriptions: toSetPrescriptions(item.prescriptions),
          })),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Creazione fallita");
      setBusy(false);
      return;
    }

    setBusy(false);
    router.replace("/workouts");
  };

  return (
    <Screen padded={false}>
      <BackHeader onPress={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Title>CREA SCHEDA</Title>
          <Body>
            Una scheda ha più giorni (Petto, Gambe, …), ciascuno con i suoi
            esercizi. Per ogni esercizio puoi impostare reps e recupero diversi
            per serie.
          </Body>
          {error ? <ErrorBanner message={error} /> : null}

          <SectionLabel>SCHEDA</SectionLabel>
          <Field
            placeholder="Nome scheda (es. Push/Pull/Legs)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <SectionLabel>GIORNI DELLA SCHEDA</SectionLabel>
          <View style={styles.dayRow}>
            {days.map((day) => {
              const selected = day.key === activeDay.key;
              return (
                <Pressable
                  key={day.key}
                  onPress={() => setActiveDayKey(day.key)}
                  style={[styles.dayChip, selected && styles.dayChipSelected]}
                >
                  <Meta style={selected ? styles.dayChipLabelSelected : undefined}>
                    {day.name.trim() || "Giorno"}
                  </Meta>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.dayActions}>
            <SecondaryButton label="Aggiungi giorno" onPress={addDay} />
            {days.length > 1 ? (
              <Pressable onPress={removeActiveDay}>
                <Meta style={styles.remove}>Rimuovi giorno corrente</Meta>
              </Pressable>
            ) : null}
          </View>

          <SectionLabel>GIORNO CORRENTE</SectionLabel>
          <Field
            placeholder="Nome giorno (es. Petto / Bicipiti)"
            value={activeDay.name}
            onChangeText={(value) => patchActiveDay({ name: value })}
            autoCapitalize="words"
          />
          <Meta style={styles.fieldLabel}>Giorni in settimana</Meta>
          <WeekdayChips
            selected={activeDay.weekdays}
            onChange={(weekdays) => patchActiveDay({ weekdays })}
          />

          <SectionLabel>ESERCIZI</SectionLabel>
          {activeDay.exercises.map((item) => (
            <View key={item.key} style={styles.exerciseBlock}>
              <Field
                placeholder="Nome esercizio"
                value={item.name}
                onChangeText={(value) => updateExercise(item.key, { name: value })}
                autoCapitalize="words"
              />
              <SetPrescriptionEditor
                prescriptions={item.prescriptions}
                onChange={(prescriptions) =>
                  updateExercise(item.key, { prescriptions })
                }
                disabled={busy}
              />
              {activeDay.exercises.length > 1 ? (
                <Pressable onPress={() => removeExercise(item.key)}>
                  <Meta style={styles.remove}>Rimuovi esercizio</Meta>
                </Pressable>
              ) : null}
            </View>
          ))}

          <SecondaryButton
            label="Aggiungi esercizio"
            onPress={() => {
              animateLayoutSoft();
              patchActiveDay({
                exercises: [...activeDay.exercises, newExercise()],
              });
            }}
          />
          <PrimaryButton
            label={busy ? "Salvataggio…" : "SALVA SCHEDA"}
            onPress={() => {
              void onSave();
            }}
            disabled={busy}
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
  },
  dayChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  dayChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  dayChipLabelSelected: {
    color: colors.textHeading,
    fontWeight: "700",
  },
  dayActions: {
    gap: spacing.xs,
  },
  fieldLabel: {
    marginTop: spacing.xs,
  },
  exerciseBlock: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  remove: {
    color: colors.danger,
    fontWeight: "600",
  },
});

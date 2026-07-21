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
import { colors, radii, spacing } from "../../src/theme";

type DraftExercise = {
  key: string;
  name: string;
  sets: string;
  reps: string;
};

const newExercise = (): DraftExercise => ({
  key: String(Date.now() + Math.random()),
  name: "",
  sets: "3",
  reps: "8",
});

/** Crea una scheda minima: nome + un giorno + esercizi. */
export default function NewWorkoutScreen() {
  const [name, setName] = useState("");
  const [dayName, setDayName] = useState("Giorno A");
  const [exercises, setExercises] = useState<DraftExercise[]>([newExercise()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const updateExercise = (
    key: string,
    patch: Partial<Omit<DraftExercise, "key">>,
  ) => {
    setExercises((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeExercise = (key: string) => {
    setExercises((current) =>
      current.length <= 1 ? current : current.filter((item) => item.key !== key),
    );
  };

  const onSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Inserisci il nome della scheda");
      return;
    }

    const parsedExercises = exercises.map((item) => {
      const sets = Number(item.sets);
      const reps = Number(item.reps);
      return {
        name: item.name.trim(),
        sets,
        reps,
      };
    });

    if (parsedExercises.some((item) => !item.name)) {
      setError("Ogni esercizio deve avere un nome");
      return;
    }

    if (
      parsedExercises.some(
        (item) =>
          !Number.isFinite(item.sets) ||
          item.sets < 1 ||
          !Number.isFinite(item.reps) ||
          item.reps < 1,
      )
    ) {
      setError("Serie e reps devono essere numeri positivi");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // Lasciamo i default BE per tipo/frequenza (evita mismatch sul carattere ×).
      await saveWorkoutProgram({
        name: trimmedName,
        defaultRestSec: 90,
        days: [
          {
            name: dayName.trim() || "Giorno A",
            sortOrder: 0,
            weekdays: [0, 2, 4],
            exercises: parsedExercises.map((item) => ({
              name: item.name,
              setPrescriptions: Array.from({ length: item.sets }, (_, index) => ({
                setNumber: index + 1,
                reps: item.reps,
                restSec: 90,
              })),
            })),
          },
        ],
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
          <Body>Nome, un giorno e gli esercizi. Puoi raffinare dal web.</Body>
          {error ? <ErrorBanner message={error} /> : null}

          <SectionLabel>SCHEDA</SectionLabel>
          <Field
            placeholder="Nome scheda (es. Push/Pull)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Field
            placeholder="Nome giorno"
            value={dayName}
            onChangeText={setDayName}
            autoCapitalize="words"
          />

          <SectionLabel>ESERCIZI</SectionLabel>
          {exercises.map((item) => (
            <View key={item.key} style={styles.exerciseBlock}>
              <Field
                placeholder="Nome esercizio"
                value={item.name}
                onChangeText={(value) => updateExercise(item.key, { name: value })}
                autoCapitalize="words"
              />
              <View style={styles.row}>
                <Field
                  placeholder="Serie"
                  keyboardType="number-pad"
                  value={item.sets}
                  onChangeText={(value) => updateExercise(item.key, { sets: value })}
                  style={styles.half}
                />
                <Field
                  placeholder="Reps"
                  keyboardType="number-pad"
                  value={item.reps}
                  onChangeText={(value) => updateExercise(item.key, { reps: value })}
                  style={styles.half}
                />
              </View>
              {exercises.length > 1 ? (
                <Pressable onPress={() => removeExercise(item.key)}>
                  <Meta style={styles.remove}>Rimuovi</Meta>
                </Pressable>
              ) : null}
            </View>
          ))}

          <SecondaryButton
            label="Aggiungi esercizio"
            onPress={() => setExercises((current) => [...current, newExercise()])}
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
  exerciseBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1, marginBottom: 0 },
  remove: { color: colors.danger, marginTop: spacing.xs },
});

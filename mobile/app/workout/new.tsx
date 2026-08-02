import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { ApiError } from "../../src/api/client";
import { saveWorkoutProgram } from "../../src/api";
import {
  AppText,
  Body,
  ErrorBanner,
  Field,
  Heading,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
} from "../../src/components";
import {
  parseSchedaTxt,
  SCHEDA_TXT_AI_PROMPT,
  SCHEDA_TXT_EXAMPLE,
} from "../../src/schedatxt/parseSchedaTxt";
import { colors, radii, spacing } from "../../src/theme";

type Mode = "choose" | "diy" | "ai";

export default function NewWorkoutScreen() {
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [reps, setReps] = useState("10");
  const [txt, setTxt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const diyReady = useMemo(
    () => name.trim().length > 0 && exerciseName.trim().length > 0,
    [name, exerciseName],
  );

  const onSharePrompt = async () => {
    try {
      await Share.share({ message: SCHEDA_TXT_AI_PROMPT });
    } catch {
      setError("Impossibile condividere/copiare il prompt");
    }
  };

  const onSaveDiy = async () => {
    setBusy(true);
    setError(null);

    try {
      const repsValue = Number(reps) || 10;
      await saveWorkoutProgram({
        name: name.trim(),
        defaultRestSec: 90,
        workoutType: "Forza + Ipertrofia",
        frequency: "3× a settimana",
        days: [
          {
            name: "Giorno 1",
            sortOrder: 0,
            weekdays: [1],
            exercises: [
              {
                name: exerciseName.trim(),
                setPrescriptions: [
                  { setNumber: 1, reps: repsValue, restSec: 90 },
                  { setNumber: 2, reps: repsValue, restSec: 90 },
                  { setNumber: 3, reps: repsValue, restSec: 90 },
                ],
              },
            ],
          },
        ],
      });
      router.replace("/(app)/workouts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvataggio fallito");
    } finally {
      setBusy(false);
    }
  };

  const onSaveAi = async () => {
    setBusy(true);
    setError(null);

    try {
      const parsed = parseSchedaTxt(txt);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }

      await saveWorkoutProgram({
        name: parsed.value.name,
        defaultRestSec: parsed.value.settings.defaultRestSec,
        workoutType: parsed.value.settings.workoutType,
        frequency: parsed.value.settings.frequency,
        days: parsed.value.days.map((day) => ({
          name: day.name,
          sortOrder: day.sortOrder,
          weekdays: day.weekdays as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
          exercises: day.exercises.map((exercise) => ({
            name: exercise.name,
            setPrescriptions: exercise.setPrescriptions,
          })),
        })),
      });
      router.replace("/(app)/workouts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Salvataggio fallito");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()}>
            <Meta>← Indietro</Meta>
          </Pressable>
          <Heading>Nuova scheda</Heading>

          {error ? <ErrorBanner message={error} /> : null}

          {mode === "choose" ? (
            <View style={styles.block}>
              <Body>Come vuoi creare la scheda?</Body>
              <PrimaryButton
                label="La creo da me"
                onPress={() => setMode("diy")}
              />
              <SecondaryButton
                label="Con prompt AI (incolla testo)"
                onPress={() => setMode("ai")}
              />
            </View>
          ) : null}

          {mode === "diy" ? (
            <View style={styles.block}>
              <SectionLabel>BUILDER BASE</SectionLabel>
              <Field
                placeholder="Nome scheda"
                value={name}
                onChangeText={setName}
              />
              <Field
                placeholder="Primo esercizio"
                value={exerciseName}
                onChangeText={setExerciseName}
              />
              <Field
                placeholder="Reps per serie"
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
              />
              <Body>
                Crea una scheda con un giorno e 3 serie. Potrai arricchirla dopo.
              </Body>
              <PrimaryButton
                label={busy ? "Salvataggio…" : "Salva scheda"}
                onPress={() => void onSaveDiy()}
                disabled={busy || !diyReady}
              />
              <SecondaryButton
                label="Cambia modalità"
                onPress={() => setMode("choose")}
                disabled={busy}
              />
            </View>
          ) : null}

          {mode === "ai" ? (
            <View style={styles.block}>
              <SectionLabel>PROMPT AI</SectionLabel>
              <Body>
                Condividi/copia il prompt, usalo in ChatGPT/Claude, poi incolla
                qui la scheda generata.
              </Body>
              <PrimaryButton
                label="Condividi / copia prompt AI"
                onPress={() => void onSharePrompt()}
              />
              <SecondaryButton
                label="Carica esempio"
                onPress={() => setTxt(SCHEDA_TXT_EXAMPLE)}
              />
              <TextInput
                placeholder="Incolla qui la scheda TXT"
                placeholderTextColor={colors.muted}
                value={txt}
                onChangeText={setTxt}
                multiline
                style={styles.txt}
              />
              <PrimaryButton
                label={busy ? "Salvataggio…" : "Crea da testo"}
                onPress={() => void onSaveAi()}
                disabled={busy || txt.trim().length < 10}
              />
              <SecondaryButton
                label="Cambia modalità"
                onPress={() => setMode("choose")}
                disabled={busy}
              />
            </View>
          ) : null}

          <AppText tone="muted" style={styles.hint}>
            Le schede create da te restano modificabili anche dopo il link al
            coach. Le schede del coach sono solo lettura.
          </AppText>
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
  block: { gap: spacing.sm, marginTop: spacing.md },
  txt: {
    minHeight: 180,
    textAlignVertical: "top",
    backgroundColor: colors.surface,
    color: colors.textHeading,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { marginTop: spacing.lg },
});

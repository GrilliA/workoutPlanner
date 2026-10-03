import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { ApiError, saveWorkoutProgram } from "../../api";
import {
  AppText,
  BackHeader,
  Body,
  DangerButton,
  ErrorBanner,
  Field,
  Heading,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
} from "../../components";
import {
  parseSchedaTxt,
  SCHEDA_TXT_AI_PROMPT,
  SCHEDA_TXT_EXAMPLE,
  type ParsedScheda,
} from "../../schedatxt/parseSchedaTxt";
import { colors, radii, spacing } from "../../theme";
import { exerciseHeading } from "./exerciseDisplay";
import { ProgramExerciseCard } from "./ProgramExerciseCard";
import { WeekdayChips } from "./WeekdayChips";
import {
  newWorkoutDraftDay,
  WEEKDAY_LABELS_SHORT,
  toWorkoutProgramInput,
  validateWorkoutDraft,
  workoutDraftFromSchedaTxt,
  type WorkoutDraft,
  type WorkoutDraftDay,
  type WorkoutDraftExercise,
} from "./workoutDraft";
import {
  WorkoutExerciseSheet,
  type ExerciseSheetTarget,
} from "./WorkoutExerciseSheet";

type WorkoutBuilderProps = {
  initialDraft: WorkoutDraft;
  workoutId?: number;
  readOnly?: boolean;
};

function dayMeta(day: WorkoutDraftDay): string {
  const weekdays =
    day.weekdays.length > 0
      ? day.weekdays.map((weekday) => WEEKDAY_LABELS_SHORT[weekday] ?? "").join(" · ")
      : "Nessun giorno in calendario";
  const count = day.exercises.length;
  const exercises =
    count === 0 ? "Nessun esercizio" : `${count} ${count === 1 ? "esercizio" : "esercizi"}`;
  return `${weekdays} — ${exercises}`;
}

type ImportSchedaModalProps = {
  onClose: () => void;
  onApply: (parsed: ParsedScheda) => void;
};

function ImportSchedaModal({ onClose, onApply }: ImportSchedaModalProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSharePrompt = async () => {
    try {
      await Share.share({ message: SCHEDA_TXT_AI_PROMPT });
    } catch {
      setError("Impossibile condividere/copiare il prompt");
    }
  };

  const onImport = () => {
    const parsed = parseSchedaTxt(text);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onApply(parsed.value);
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Heading>Importa da testo</Heading>
            {error ? <ErrorBanner message={error} /> : null}
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
              onPress={() => setText(SCHEDA_TXT_EXAMPLE)}
            />
            <TextInput
              placeholder="Incolla qui la scheda TXT"
              placeholderTextColor={colors.muted}
              value={text}
              onChangeText={setText}
              multiline
              style={styles.txt}
            />
            <PrimaryButton
              label="Importa"
              onPress={onImport}
              disabled={text.trim().length < 10}
            />
            <SecondaryButton label="Annulla" onPress={onClose} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** Builder scheda: bozza locale giorni → esercizi → serie, salvata in un colpo. */
export function WorkoutBuilder({
  initialDraft,
  workoutId,
  readOnly = false,
}: WorkoutBuilderProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ExerciseSheetTarget | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const openDay = draft.days.find((day) => day.key === openDayKey) ?? null;

  useEffect(() => {
    if (error) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [error]);

  useEffect(() => {
    if (openDayKey == null) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setOpenDayKey(null);
        return true;
      },
    );
    return () => subscription.remove();
  }, [openDayKey]);

  const patchDay = (key: string, patch: Partial<WorkoutDraftDay>) => {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.key === key ? { ...day, ...patch } : day,
      ),
    }));
  };

  const addDay = () => {
    setDraft((current) => ({
      ...current,
      days: [...current.days, newWorkoutDraftDay(current.days)],
    }));
  };

  const onDeleteDay = (day: WorkoutDraftDay) => {
    Alert.alert("Elimina giorno", `Rimuovere “${day.name}” e i suoi esercizi?`, [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: () => {
          setDraft((current) => ({
            ...current,
            days: current.days.filter((item) => item.key !== day.key),
          }));
          setOpenDayKey(null);
        },
      },
    ]);
  };

  const onSheetSave = (exercise: WorkoutDraftExercise) => {
    if (!sheet) {
      return;
    }
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) => {
        if (day.key !== sheet.dayKey) {
          return day;
        }
        const exists = day.exercises.some(
          (item) => item.key === exercise.key,
        );
        return {
          ...day,
          exercises: exists
            ? day.exercises.map((item) =>
                item.key === exercise.key ? exercise : item,
              )
            : [...day.exercises, exercise],
        };
      }),
    }));
    setSheet(null);
  };

  const onSheetRemove = () => {
    if (!sheet?.exercise) {
      return;
    }
    const removed = sheet.exercise.key;
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.key === sheet.dayKey
          ? {
              ...day,
              exercises: day.exercises.filter((item) => item.key !== removed),
            }
          : day,
      ),
    }));
    setSheet(null);
  };

  const onImportApply = (parsed: ParsedScheda) => {
    const apply = () => {
      setDraft(workoutDraftFromSchedaTxt(parsed));
      setOpenDayKey(null);
      setImportOpen(false);
    };
    const hasExercises = draft.days.some((day) => day.exercises.length > 0);
    if (hasExercises) {
      Alert.alert("Importa da testo", "Sostituire la bozza attuale?", [
        { text: "Annulla", style: "cancel" },
        { text: "Sostituisci", style: "destructive", onPress: apply },
      ]);
      return;
    }
    apply();
  };

  const onSave = async () => {
    const invalid = validateWorkoutDraft(draft);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveWorkoutProgram(toWorkoutProgramInput(draft), workoutId);
      if (workoutId != null) {
        router.back();
      } else {
        router.replace("/(app)/workouts");
      }
    } catch (err) {
      setError(ApiError.messageFrom(err, "Salvataggio fallito"));
    } finally {
      setBusy(false);
    }
  };

  const title = readOnly
    ? "Dettaglio scheda"
    : workoutId != null
      ? "Modifica scheda"
      : "Nuova scheda";

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <BackHeader
          onPress={() =>
            openDayKey != null ? setOpenDayKey(null) : router.back()
          }
        />
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Heading>{title}</Heading>
          {readOnly ? (
            <Body>
              Scheda del coach: sola lettura. Puoi usarla dalla Home.
            </Body>
          ) : null}
          {error ? <ErrorBanner message={error} /> : null}

          {!openDay ? (
            <View style={styles.block}>
              <SectionLabel>NOME SCHEDA</SectionLabel>
              <Field
                placeholder="Nome scheda"
                value={draft.name}
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, name: value }))
                }
                editable={!readOnly && !busy}
              />

              <SectionLabel>GIORNI</SectionLabel>
              {draft.days.map((day) => (
                <Pressable
                  key={day.key}
                  onPress={() => setOpenDayKey(day.key)}
                  style={styles.dayCard}
                  accessibilityRole="button"
                >
                  <AppText tone="heading" style={styles.dayName}>
                    {day.name}
                  </AppText>
                  <Meta>{dayMeta(day)}</Meta>
                </Pressable>
              ))}
              {!readOnly ? (
                <>
                  <SecondaryButton
                    label="+ Aggiungi giorno"
                    onPress={addDay}
                    disabled={busy}
                  />
                  <SecondaryButton
                    label="Importa da testo"
                    onPress={() => setImportOpen(true)}
                    disabled={busy}
                  />
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.block}>
              <Field
                placeholder="Nome giorno"
                value={openDay.name}
                onChangeText={(value) =>
                  patchDay(openDay.key, { name: value })
                }
                editable={!readOnly && !busy}
              />
              <Meta>Giorni in calendario</Meta>
              <WeekdayChips
                selected={openDay.weekdays}
                onChange={(weekdays) =>
                  patchDay(openDay.key, { weekdays })
                }
                disabled={readOnly || busy}
              />

              <SectionLabel>ESERCIZI</SectionLabel>
              {openDay.exercises.length === 0 ? (
                <Body>Nessun esercizio in questo giorno.</Body>
              ) : (
                openDay.exercises.map((exercise, index) => (
                  <Pressable
                    key={exercise.key}
                    onPress={() =>
                      setSheet({ dayKey: openDay.key, exercise })
                    }
                    disabled={readOnly}
                    accessibilityRole="button"
                    accessibilityLabel={
                      exercise.prescriptions.length === 0
                        ? `${exerciseHeading(exercise)}, Senza serie`
                        : `${exerciseHeading(exercise)}, ${exercise.prescriptions.length} serie: ${exercise.prescriptions
                            .map(
                              (item) =>
                                `${item.reps.trim() || "—"} reps, recupero ${item.restSec} secondi`,
                            )
                            .join("; ")}`
                    }
                  >
                    <ProgramExerciseCard
                      exercise={exercise}
                      index={index + 1}
                      prescriptions={exercise.prescriptions}
                    />
                  </Pressable>
                ))
              )}
              {!readOnly ? (
                <>
                  <SecondaryButton
                    label="+ Esercizio"
                    onPress={() =>
                      setSheet({ dayKey: openDay.key, exercise: null })
                    }
                    disabled={busy}
                  />
                  <DangerButton
                    label="Elimina giorno"
                    onPress={() => onDeleteDay(openDay)}
                    disabled={busy || draft.days.length <= 1}
                  />
                </>
              ) : null}
            </View>
          )}
        </ScrollView>

        {!readOnly ? (
          <View style={styles.saveBar}>
            <PrimaryButton
              label={busy ? "Salvataggio…" : "Salva scheda"}
              onPress={() => void onSave()}
              disabled={busy}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {sheet ? (
        <WorkoutExerciseSheet
          target={sheet}
          defaultRestSec={draft.defaultRestSec}
          onCancel={() => setSheet(null)}
          onSave={onSheetSave}
          onRemove={sheet.exercise ? onSheetRemove : undefined}
        />
      ) : null}
      {importOpen ? (
        <ImportSchedaModal
          onClose={() => setImportOpen(false)}
          onApply={onImportApply}
        />
      ) : null}
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
  block: {
    gap: spacing.sm,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
});

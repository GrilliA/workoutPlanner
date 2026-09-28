import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  searchCatalogExercises,
  type CatalogExercise,
} from "../../api";
import {
  AppText,
  Body,
  DangerButton,
  ErrorBanner,
  Field,
  Heading,
  Meta,
  PrimaryButton,
  SecondaryButton,
} from "../../components";
import { ExerciseMediaFlip } from "../session/ExerciseMediaFlip";
import { colors, spacing } from "../../theme";
import { exerciseEnglishLine, exerciseHeading } from "./exerciseDisplay";
import {
  prescriptionsFromUniform,
  validatePrescriptionDrafts,
} from "./prescriptionDraft";
import { SetPrescriptionEditor } from "./SetPrescriptionEditor";
import {
  workoutDraftExerciseFromCatalog,
  type WorkoutDraftExercise,
} from "./workoutDraft";

export type ExerciseSheetTarget = {
  dayKey: string;
  exercise: WorkoutDraftExercise | null;
};

type WorkoutExerciseSheetProps = {
  target: ExerciseSheetTarget;
  defaultRestSec: number;
  onCancel: () => void;
  onSave: (exercise: WorkoutDraftExercise) => void;
  onRemove?: () => void;
};

function customExercise(name: string, restSec: number): WorkoutDraftExercise {
  return {
    key: `ex-${Date.now()}-${Math.random()}`,
    catalogId: null,
    name,
    nameIt: null,
    nameEn: null,
    imageUrl: null,
    imageUrlEnd: null,
    prescriptions: prescriptionsFromUniform(3, 10, restSec),
  };
}

/** Sheet esercizio: ricerca catalogo o custom + editor serie. */
export function WorkoutExerciseSheet({
  target,
  defaultRestSec,
  onCancel,
  onSave,
  onRemove,
}: WorkoutExerciseSheetProps) {
  const editing = target.exercise != null;
  const [draft, setDraft] = useState<WorkoutDraftExercise | null>(
    target.exercise,
  );
  const [picking, setPicking] = useState(target.exercise == null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!picking || q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchFailed(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchFailed(false);
    const timer = setTimeout(() => {
      searchCatalogExercises({ q, limit: 20 })
        .then((result) => {
          if (!cancelled) {
            setResults(result.items);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setSearching(false);
            setSearchFailed(true);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, picking]);

  const adopt = (selected: WorkoutDraftExercise) => {
    setDraft((current) =>
      current
        ? {
            ...selected,
            key: current.key,
            id: current.id,
            prescriptions: current.prescriptions,
          }
        : selected,
    );
    setPicking(false);
    setError(null);
  };

  const onSavePress = () => {
    if (!draft) {
      return;
    }
    const invalid = validatePrescriptionDrafts(draft.prescriptions);
    if (invalid) {
      setError(invalid);
      return;
    }
    onSave(draft);
  };

  const draftEnglish = draft ? exerciseEnglishLine(draft) : null;

  const onRemovePress = () => {
    if (!draft) {
      return;
    }
    Alert.alert(
      "Rimuovi esercizio",
      `Rimuovere “${exerciseHeading(draft)}” da questo giorno?`,
      [
        { text: "Annulla", style: "cancel" },
        { text: "Rimuovi", style: "destructive", onPress: () => onRemove?.() },
      ],
    );
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
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
            <Heading>
              {editing ? "Modifica esercizio" : "Nuovo esercizio"}
            </Heading>
            {error ? <ErrorBanner message={error} /> : null}

            {picking ? (
              <View style={styles.block}>
                <Field
                  placeholder="Cerca nel catalogo…"
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
                {searching ? <Meta>Ricerca…</Meta> : null}
                {searchFailed ? (
                  <Meta>
                    Ricerca non disponibile, puoi usare un esercizio
                    personalizzato
                  </Meta>
                ) : null}
                {results.map((item) => {
                  const english = exerciseEnglishLine(item);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        adopt(
                          workoutDraftExerciseFromCatalog(item, defaultRestSec),
                        )
                      }
                      style={styles.resultRow}
                      accessibilityRole="button"
                    >
                      <ExerciseMediaFlip
                        imageUrl={item.imageUrl}
                        imageUrlEnd={item.imageUrlEnd}
                        variant="thumb"
                        compact
                        placeholder
                      />
                      <View style={styles.resultText}>
                        <AppText tone="heading" style={styles.resultTitle}>
                          {exerciseHeading(item)}
                        </AppText>
                        {english ? <Meta>{english}</Meta> : null}
                      </View>
                    </Pressable>
                  );
                })}
                {query.trim().length >= 2 ? (
                  <Pressable
                    onPress={() =>
                      adopt(customExercise(query.trim(), defaultRestSec))
                    }
                    style={styles.resultRow}
                    accessibilityRole="button"
                  >
                    <View style={styles.resultText}>
                      <AppText tone="accent" style={styles.resultTitle}>
                        Usa “{query.trim()}” come esercizio personalizzato
                      </AppText>
                    </View>
                  </Pressable>
                ) : (
                  <Body>
                    Scrivi almeno 2 caratteri per cercare, oppure crea un
                    esercizio personalizzato.
                  </Body>
                )}
                {draft ? (
                  <SecondaryButton
                    label="Torna all'esercizio"
                    onPress={() => setPicking(false)}
                  />
                ) : null}
              </View>
            ) : draft ? (
              <View style={styles.block}>
                <View style={styles.selectedRow}>
                  <ExerciseMediaFlip
                    imageUrl={draft.imageUrl}
                    imageUrlEnd={draft.imageUrlEnd}
                    variant="thumb"
                    compact
                    placeholder
                  />
                  <View style={styles.resultText}>
                    <AppText tone="heading" style={styles.resultTitle}>
                      {exerciseHeading(draft)}
                    </AppText>
                    {draftEnglish ? <Meta>{draftEnglish}</Meta> : null}
                  </View>
                  <Pressable
                    onPress={() => setPicking(true)}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <AppText tone="accent" style={styles.changeLabel}>
                      Cambia
                    </AppText>
                  </Pressable>
                </View>
                <SetPrescriptionEditor
                  prescriptions={draft.prescriptions}
                  onChange={(prescriptions) =>
                    setDraft({ ...draft, prescriptions })
                  }
                />
                <PrimaryButton label="Salva esercizio" onPress={onSavePress} />
                {onRemove ? (
                  <DangerButton
                    label="Rimuovi esercizio"
                    onPress={onRemovePress}
                  />
                ) : null}
              </View>
            ) : null}

            <SecondaryButton label="Annulla" onPress={onCancel} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  block: {
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeLabel: {
    fontWeight: "600",
  },
});

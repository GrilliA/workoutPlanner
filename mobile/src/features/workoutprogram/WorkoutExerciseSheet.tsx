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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  searchCatalogExercises,
  type CatalogExercise,
} from "../../api";
import {
  AppText,
  BUTTON_MIN_HEIGHT,
  ErrorBanner,
  Field,
  Heading,
  Meta,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
} from "../../components";
import { ExerciseMediaFlip } from "../session/ExerciseMediaFlip";
import { colors, radii, spacing } from "../../theme";
import { useKeyboardVisible } from "../../utils/useKeyboardVisible";

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

/** Etichetta in italiano, valori = primaryMuscles del catalogo. */
const MUSCLE_FILTERS = [
  { label: "Petto", muscles: ["chest"] },
  { label: "Schiena", muscles: ["lats", "middle back", "lower back", "traps"] },
  {
    label: "Gambe",
    muscles: ["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"],
  },
  { label: "Spalle", muscles: ["shoulders"] },
  { label: "Braccia", muscles: ["biceps", "triceps", "forearms"] },
] as const;

type MuscleFilter = (typeof MUSCLE_FILTERS)[number];

const RESULT_LIMIT = 20;

async function searchByName(nameQuery: string): Promise<CatalogExercise[]> {
  const result = await searchCatalogExercises({ q: nameQuery, limit: RESULT_LIMIT });
  return result.items;
}

/** Il catalogo filtra un muscolo per volta: si uniscono le liste, senza doppioni. */
async function searchByMuscles(
  muscles: readonly string[],
): Promise<CatalogExercise[]> {
  const pages = await Promise.all(
    muscles.map((muscle) =>
      searchCatalogExercises({ muscle, limit: RESULT_LIMIT }),
    ),
  );
  const items = pages.flatMap((page) => page.items);
  // Un esercizio con più muscoli primari arriva da più liste: si tiene il primo.
  return items.filter(
    (item, index) =>
      items.findIndex((other) => other.id === item.id) === index,
  );
}

type SearchOutcome = {
  key: string;
  items: CatalogExercise[];
  failed: boolean;
};

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
    notes: null,
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
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>(
    MUSCLE_FILTERS[0],
  );
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const showsSave = Boolean(draft) && !picking;
  const saveButtonOffset = Math.max(insets.bottom, spacing.md);

  const nameQuery = query.trim();
  const isNameSearch = nameQuery.length >= 2;
  const searchKey = isNameSearch ? `q:${nameQuery}` : `m:${muscleFilter.label}`;
  // Risultati e messaggi solo se appartengono alla ricerca corrente.
  const currentOutcome = outcome?.key === searchKey ? outcome : null;
  const searching = picking && currentOutcome === null;
  const results = currentOutcome?.items ?? [];
  const searchFailed = currentOutcome?.failed ?? false;
  const showsNoMuscleResults =
    currentOutcome !== null && !searchFailed && results.length === 0 && !isNameSearch;

  useEffect(() => {
    if (!picking) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const request = isNameSearch
        ? searchByName(nameQuery)
        : searchByMuscles(muscleFilter.muscles);
      request
        .then((items) => {
          if (!cancelled) {
            setOutcome({ key: searchKey, items, failed: false });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOutcome({ key: searchKey, items: [], failed: true });
          }
        });
    }, isNameSearch ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [picking, searchKey]);

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
            contentContainerStyle={[
              styles.content,
              showsSave && {
                paddingBottom: BUTTON_MIN_HEIGHT + spacing.xl + saveButtonOffset,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Heading style={styles.heading}>
                {editing ? "Modifica esercizio" : "Nuovo esercizio"}
              </Heading>
              <Pressable
                onPress={onCancel}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Annulla"
              >
                <AppText tone="accent" style={styles.cancelLabel}>
                  Annulla
                </AppText>
              </Pressable>
            </View>
            {error ? <ErrorBanner message={error} /> : null}

            {picking ? (
              <View style={styles.block}>
                <Field
                  placeholder="Cerca nel catalogo…"
                  value={query}
                  onChangeText={setQuery}
                />
                <View style={styles.muscleRow}>
                  {MUSCLE_FILTERS.map((filter) => {
                    const isOn = !isNameSearch && filter === muscleFilter;
                    return (
                      <Pressable
                        key={filter.label}
                        onPress={() => {
                          setMuscleFilter(filter);
                          setQuery("");
                        }}
                        style={[styles.muscleChip, isOn && styles.muscleChipOn]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isOn }}
                        accessibilityLabel={filter.label}
                      >
                        <AppText
                          style={[
                            styles.muscleLabel,
                            isOn && styles.muscleLabelOn,
                          ]}
                        >
                          {filter.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                {searching ? <Meta>Ricerca…</Meta> : null}
                {searchFailed ? (
                  <Meta>
                    Ricerca non disponibile, puoi usare un esercizio
                    personalizzato
                  </Meta>
                ) : null}
                {!isNameSearch ? (
                  <SectionLabel>{muscleFilter.label}</SectionLabel>
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
                {showsNoMuscleResults ? (
                  <Meta>Nessun esercizio per questo muscolo.</Meta>
                ) : null}
                {isNameSearch ? (
                  <Pressable
                    onPress={() =>
                      adopt(customExercise(nameQuery, defaultRestSec))
                    }
                    style={styles.resultRow}
                    accessibilityRole="button"
                  >
                    <View style={styles.resultText}>
                      <AppText tone="accent" style={styles.resultTitle}>
                        Usa “{nameQuery}” come esercizio personalizzato
                      </AppText>
                    </View>
                  </Pressable>
                ) : null}
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
                {onRemove ? (
                  <Pressable
                    onPress={onRemovePress}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <AppText tone="danger" style={styles.removeLabel}>
                      Rimuovi esercizio
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
          {showsSave && !keyboardVisible ? (
            <View
              pointerEvents="box-none"
              style={[styles.saveWrap, { bottom: saveButtonOffset }]}
            >
              <PrimaryButton label="Salva esercizio" onPress={onSavePress} />
            </View>
          ) : null}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heading: {
    flex: 1,
  },
  cancelLabel: {
    fontWeight: "700",
  },
  block: {
    gap: spacing.sm,
  },
  muscleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  muscleChip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleChipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  muscleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  muscleLabelOn: {
    color: colors.onInk,
  },
  saveWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  removeLabel: {
    fontWeight: "700",
    paddingVertical: spacing.sm,
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

import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { CatalogExercise } from "../../api";
import { AppText, Field, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";
import { useCatalogSearch } from "./useCatalogSearch";

type ExercisePickerProps = {
  value: string;
  onChange: (name: string, catalogId: string | null) => void;
  placeholder?: string;
};

/**
 * Campo nome esercizio + suggerimenti catalogo (nomi in inglese).
 * Si può sempre scrivere testo libero in italiano.
 */
export function ExercisePicker({
  value,
  onChange,
  placeholder = "Cerca (EN) o digita un nome",
}: ExercisePickerProps) {
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { setQuery, results, isSearching, error } = useCatalogSearch();

  const showResults = open && value.trim().length >= 2;

  const handleChange = (next: string) => {
    setCatalogId(null);
    setQuery(next);
    onChange(next, null);
    setOpen(true);
  };

  const handleSelect = (exercise: CatalogExercise) => {
    setCatalogId(exercise.id);
    setQuery(exercise.name);
    onChange(exercise.name, exercise.id);
    setOpen(false);
  };

  return (
    <View style={styles.root}>
      <Field
        placeholder={placeholder}
        value={value}
        onChangeText={handleChange}
        onFocus={() => {
          setQuery(value);
          setOpen(true);
        }}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {catalogId ? (
        <Meta style={styles.hintOk}>Dal catalogo (EN)</Meta>
      ) : value.trim().length > 0 ? (
        <Meta>Testo libero — puoi anche scegliere dal catalogo EN</Meta>
      ) : null}

      {error ? <Meta style={styles.hintError}>{error}</Meta> : null}

      {showResults ? (
        <View style={styles.results}>
          {isSearching ? <Meta>Cerco…</Meta> : null}
          {!isSearching && results.length === 0 ? (
            <Meta>Nessun risultato — usa il nome digitato</Meta>
          ) : null}
          {results.map((exercise) => (
            <Pressable
              key={exercise.id}
              style={styles.result}
              onPress={() => handleSelect(exercise)}
            >
              <AppText tone="heading" style={styles.resultName}>
                {exercise.name}
              </AppText>
              <Meta>
                {[exercise.primaryMuscles[0], exercise.equipment]
                  .filter(Boolean)
                  .join(" · ")}
              </Meta>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.sm,
  },
  hintOk: {
    color: colors.accent,
  },
  hintError: {
    color: colors.danger,
  },
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    padding: spacing.sm,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  result: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600",
  },
});

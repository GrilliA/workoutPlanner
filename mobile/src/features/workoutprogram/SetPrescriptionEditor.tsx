import { Pressable, StyleSheet, View } from "react-native";
import { Field, Meta, SecondaryButton } from "../../components";
import { colors, radii, spacing } from "../../theme";
import {
  cycleRestSec,
  newPrescription,
  type DraftPrescription,
} from "./prescriptionDraft";

type SetPrescriptionEditorProps = {
  prescriptions: DraftPrescription[];
  onChange: (next: DraftPrescription[]) => void;
  disabled?: boolean;
};

/** Editor serie: reps e recupero diversi per set (#1 10×90s, #2 8×120s, …). */
export function SetPrescriptionEditor({
  prescriptions,
  onChange,
  disabled = false,
}: SetPrescriptionEditorProps) {
  const updateAt = (key: string, patch: Partial<DraftPrescription>) => {
    onChange(
      prescriptions.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeAt = (key: string) => {
    if (prescriptions.length <= 1) {
      return;
    }
    onChange(prescriptions.filter((item) => item.key !== key));
  };

  const addSet = () => {
    const last = prescriptions.at(-1);
    onChange([
      ...prescriptions,
      newPrescription(last?.reps ?? "10", last?.restSec ?? 90),
    ]);
  };

  return (
    <View style={styles.root}>
      <Meta style={styles.hint}>Serie del piano (reps e recupero per set)</Meta>
      {prescriptions.map((item, index) => (
        <View key={item.key} style={styles.row}>
          <Meta style={styles.setLabel}>#{index + 1}</Meta>
          <View style={styles.repsWrap}>
            <Field
              placeholder="reps"
              keyboardType="number-pad"
              value={item.reps}
              onChangeText={(value) => updateAt(item.key, { reps: value })}
              style={styles.field}
              editable={!disabled}
              accessibilityLabel={`Ripetizioni serie ${index + 1}`}
            />
          </View>
          <Pressable
            onPress={() =>
              updateAt(item.key, { restSec: cycleRestSec(item.restSec) })
            }
            disabled={disabled}
            style={({ pressed }) => [
              styles.restChip,
              pressed && styles.restChipPressed,
              disabled && styles.restChipDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Recupero serie ${index + 1}: ${item.restSec} secondi. Tocca per cambiare`}
          >
            <Meta style={styles.restLabel}>{item.restSec}s</Meta>
          </Pressable>
          {prescriptions.length > 1 ? (
            <Pressable
              onPress={() => removeAt(item.key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Rimuovi serie ${index + 1}`}
            >
              <Meta style={styles.remove}>×</Meta>
            </Pressable>
          ) : (
            <View style={styles.removeSpacer} />
          )}
        </View>
      ))}
      <SecondaryButton
        label="Aggiungi serie"
        onPress={addSet}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  hint: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  setLabel: {
    width: 28,
    fontWeight: "700",
  },
  repsWrap: {
    flex: 1,
  },
  field: {
    marginBottom: 0,
  },
  restChip: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  restChipPressed: {
    borderColor: colors.accent,
  },
  restChipDisabled: {
    opacity: 0.5,
  },
  restLabel: {
    fontWeight: "700",
  },
  remove: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: spacing.xs,
  },
  removeSpacer: {
    width: 28,
  },
});

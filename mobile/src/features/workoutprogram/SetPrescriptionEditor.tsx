import { Pressable, StyleSheet, View } from "react-native";
import { Field, Meta, SecondaryButton } from "../../components";
import { colors, radii, spacing } from "../../theme";
import {
  newPrescription,
  REST_SEC_OPTIONS,
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
        <View key={item.key} style={styles.setBlock}>
          <View style={styles.row}>
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
          <View style={styles.restRow}>
            {REST_SEC_OPTIONS.map((option) => {
              const selected = item.restSec === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => updateAt(item.key, { restSec: option })}
                  disabled={disabled}
                  style={[
                    styles.restOption,
                    selected && styles.restOptionSelected,
                    disabled && styles.dimmed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Recupero serie ${index + 1}: ${option} secondi`}
                >
                  <Meta
                    style={[
                      styles.restLabel,
                      selected && styles.restLabelSelected,
                    ]}
                  >
                    {option}s
                  </Meta>
                </Pressable>
              );
            })}
          </View>
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
  setBlock: {
    gap: spacing.xs,
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
  restRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingLeft: 36,
  },
  restOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  restOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  dimmed: {
    opacity: 0.5,
  },
  restLabel: {
    fontWeight: "700",
  },
  restLabelSelected: {
    color: colors.accent,
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

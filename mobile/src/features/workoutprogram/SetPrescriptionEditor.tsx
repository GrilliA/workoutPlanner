import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Field, Meta, SecondaryButton } from "../../components";
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

  const steppedRestSec = (restSec: number, step: 1 | -1) =>
    step > 0
      ? REST_SEC_OPTIONS.find((option) => option > restSec)
      : REST_SEC_OPTIONS.filter((option) => option < restSec).at(-1);

  return (
    <View style={[styles.root, disabled && styles.dimmed]}>
      <View
        style={styles.header}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppText
          variant="eyebrow"
          tone="muted"
          style={[styles.headerLabel, styles.indexCol]}
        >
          Serie
        </AppText>
        <AppText
          variant="eyebrow"
          tone="muted"
          style={[styles.headerLabel, styles.repsCol]}
        >
          Reps
        </AppText>
        <AppText
          variant="eyebrow"
          tone="muted"
          style={[styles.headerLabel, styles.restCol]}
        >
          Recupero
        </AppText>
        <View style={styles.removeCol} />
      </View>
      {prescriptions.map((item, index) => {
        const prevRest = steppedRestSec(item.restSec, -1);
        const nextRest = steppedRestSec(item.restSec, 1);
        const canStepDown = !disabled && prevRest !== undefined;
        const canStepUp = !disabled && nextRest !== undefined;
        return (
          <View key={item.key} style={styles.setRow}>
            <AppText tone="heading" style={[styles.indexCol, styles.setIndex]}>
              {index + 1}
            </AppText>
            <Field
              placeholder="reps"
              keyboardType="number-pad"
              value={item.reps}
              onChangeText={(value) => updateAt(item.key, { reps: value })}
              style={styles.repsField}
              editable={!disabled}
              accessibilityLabel={`Ripetizioni serie ${index + 1}`}
            />
            <View style={styles.restStepper}>
              <Pressable
                onPress={() =>
                  prevRest !== undefined &&
                  updateAt(item.key, { restSec: prevRest })
                }
                disabled={!canStepDown}
                style={styles.stepButton}
                accessibilityRole="button"
                accessibilityLabel={`Diminuisci recupero serie ${index + 1}`}
                accessibilityState={{ disabled: !canStepDown }}
              >
                <AppText
                  style={[
                    styles.stepLabel,
                    !canStepDown && styles.stepLabelDisabled,
                  ]}
                >
                  ‹
                </AppText>
              </Pressable>
              <AppText
                style={styles.stepValue}
                accessibilityLabel={`Recupero serie ${index + 1}: ${item.restSec} secondi`}
              >
                {item.restSec}s
              </AppText>
              <Pressable
                onPress={() =>
                  nextRest !== undefined &&
                  updateAt(item.key, { restSec: nextRest })
                }
                disabled={!canStepUp}
                style={styles.stepButton}
                accessibilityRole="button"
                accessibilityLabel={`Aumenta recupero serie ${index + 1}`}
                accessibilityState={{ disabled: !canStepUp }}
              >
                <AppText
                  style={[
                    styles.stepLabel,
                    !canStepUp && styles.stepLabelDisabled,
                  ]}
                >
                  ›
                </AppText>
              </Pressable>
            </View>
            {prescriptions.length > 1 ? (
              <Pressable
                onPress={() => removeAt(item.key)}
                disabled={disabled}
                hitSlop={8}
                style={styles.removeCol}
                accessibilityRole="button"
                accessibilityLabel={`Rimuovi serie ${index + 1}`}
              >
                <Meta style={styles.remove}>×</Meta>
              </Pressable>
            ) : (
              <View style={styles.removeCol} />
            )}
          </View>
        );
      })}
      <SecondaryButton
        label="+ Aggiungi serie"
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  headerLabel: {
    fontSize: 11,
    textAlign: "center",
    textTransform: "uppercase",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  indexCol: {
    width: 40,
  },
  setIndex: {
    textAlign: "center",
    fontWeight: "700",
  },
  repsCol: {
    width: 72,
  },
  repsField: {
    width: 72,
    marginBottom: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    backgroundColor: colors.bg,
  },
  restCol: {
    flex: 1,
  },
  restStepper: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  stepButton: {
    width: 44,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "700",
  },
  stepLabelDisabled: {
    color: colors.muted,
    opacity: 0.4,
  },
  stepValue: {
    flex: 1,
    textAlign: "center",
    color: colors.textHeading,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  removeCol: {
    width: 28,
    alignItems: "center",
  },
  remove: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: "700",
  },
  dimmed: {
    opacity: 0.5,
  },
});

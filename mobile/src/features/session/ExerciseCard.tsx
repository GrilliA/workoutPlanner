import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import type { Exercise, LoggedSet } from "../../api";
import { AppText, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";
import { exerciseEnglishLine, exerciseHeading } from "../workoutprogram/exerciseDisplay";
import { ExerciseMediaFlip } from "./ExerciseMediaFlip";
import {
  formatWeightKg,
  getTargetRepsForSet,
  getTargetSetCount,
  isExerciseComplete,
  stepReps,
  stepWeightKg,
} from "./logDefaults";

type ExerciseCardProps = {
  exercise: Exercise;
  sets: LoggedSet[];
  /** Serie dalla sessione precedente (stesso esercizio), per colonna PRECEDENTE. */
  previousSets?: LoggedSet[];
  resting: boolean;
  readOnly: boolean;
  /** Disables log/undo/edit while a set mutation is in flight. */
  busy?: boolean;
  weight: string;
  reps: string;
  onChangeWeight: (value: string) => void;
  onChangeReps: (value: string) => void;
  onLog: () => void;
  onUndoLast: () => void;
  onEditSet: (
    setNumber: number,
    next: { reps: number; weightKg: number | null },
  ) => void;
  /** Focus mode: larger type, tabella set densità mock. */
  focus?: boolean;
  /** Indice 1-based per eyebrow "ESERCIZIO N DI M". */
  exerciseOrdinal?: number;
  exerciseTotal?: number;
};

type EditingField = "weight" | "reps" | null;

type EditDraft = {
  setNumber: number;
  weight: string;
  reps: string;
};

async function tickHaptic() {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Simulator / permissions.
  }
}

function formatLogLabel(weight: string, reps: string, setNumber: number): string {
  const kg = weight.trim() === "" ? "—" : weight.trim();
  const repValue = reps.trim() === "" ? "—" : reps.trim();
  return `LOG ${kg} × ${repValue}  ·  #${setNumber}`;
}

function formatPreviousLabel(previous: LoggedSet | undefined): string {
  if (!previous) {
    return "—";
  }
  const kg = previous.weightKg == null ? "—" : `${formatWeightKg(previous.weightKg)}kg`;
  return `${kg} × ${previous.reps}`;
}

/** Card esercizio: one-tap log, edit/undo set, stepper kg/reps. */
export function ExerciseCard({
  exercise,
  sets,
  previousSets = [],
  resting,
  readOnly,
  busy = false,
  weight,
  reps,
  onChangeWeight,
  onChangeReps,
  onLog,
  onUndoLast,
  onEditSet,
  focus = false,
  exerciseOrdinal,
  exerciseTotal,
}: ExerciseCardProps) {
  const [editing, setEditing] = useState<EditingField>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const weightRef = useRef<TextInputType>(null);
  const repsRef = useRef<TextInputType>(null);

  const targetSets = getTargetSetCount(exercise);
  const complete = isExerciseComplete(exercise, sets.length);
  const nextSetNumber = sets.length + 1;
  const targetReps = getTargetRepsForSet(exercise, nextSetNumber);
  const locked = readOnly || busy;
  const canLog = !readOnly && !complete;
  const canUndo = !readOnly && sets.length > 0 && editDraft === null;
  const actionsDisabled = busy;
  const heading = exerciseHeading(exercise);
  const english = exerciseEnglishLine(exercise);

  const startEdit = (field: EditingField) => {
    if (actionsDisabled) {
      return;
    }
    setEditing(field);
    requestAnimationFrame(() => {
      if (field === "weight") {
        weightRef.current?.focus();
      } else if (field === "reps") {
        repsRef.current?.focus();
      }
    });
  };

  const onStepWeight = (direction: 1 | -1) => {
    if (actionsDisabled) {
      return;
    }
    void tickHaptic();
    onChangeWeight(stepWeightKg(weight, direction));
  };

  const onStepReps = (direction: 1 | -1) => {
    if (actionsDisabled) {
      return;
    }
    void tickHaptic();
    onChangeReps(stepReps(reps, direction));
  };

  const openSetEditor = (logged: LoggedSet) => {
    if (locked) {
      return;
    }
    setEditError(null);
    setEditDraft({
      setNumber: logged.setNumber,
      weight:
        logged.weightKg === null ? "" : formatWeightKg(logged.weightKg),
      reps: String(logged.reps),
    });
  };

  const rejectEditSave = (message: string) => {
    setEditError(message);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {
        // Simulator / permissions.
      },
    );
  };

  const saveSetEditor = () => {
    if (!editDraft || actionsDisabled) {
      return;
    }

    const nextReps = Number(editDraft.reps);
    const weightRaw = editDraft.weight.trim();
    const weightKg = weightRaw === "" ? null : Number(weightRaw);

    if (!Number.isFinite(nextReps) || nextReps <= 0) {
      rejectEditSave("Inserisci un numero di reps valido (maggiore di 0).");
      return;
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      rejectEditSave("Inserisci un peso valido (0 o più).");
      return;
    }

    setEditError(null);
    onEditSet(editDraft.setNumber, { reps: nextReps, weightKg });
    setEditDraft(null);
  };

  return (
    <View
      style={[
        styles.card,
        focus && styles.cardFocus,
        resting && styles.cardResting,
        complete && styles.cardDone,
      ]}
    >
      <ExerciseMediaFlip
        imageUrl={exercise.imageUrl}
        imageUrlEnd={exercise.imageUrlEnd}
        variant="hero"
        placeholder
      />
      <View style={[styles.body, focus && styles.bodyFocus]}>
      {focus && exerciseOrdinal != null && exerciseTotal != null ? (
        <AppText variant="eyebrow" tone="accent" style={styles.ordinal}>
          ESERCIZIO {exerciseOrdinal} DI {exerciseTotal}
        </AppText>
      ) : null}
      <View style={styles.titleCopy}>
        <AppText
          tone="heading"
          style={[styles.name, focus && styles.nameFocus]}
        >
          {heading}
        </AppText>
        {english ? <Meta style={styles.nameEn}>{english}</Meta> : null}
      </View>
      {!focus ? (
        <Meta>
          Serie {Math.min(sets.length, targetSets)} / {targetSets}
          {canLog ? ` · target ${targetReps} reps` : ""}
        </Meta>
      ) : null}

      {focus ? (
        <View style={styles.setTable}>
          <View style={styles.setHeader}>
            <AppText style={[styles.setCol, styles.setColSet]}>SET</AppText>
            <AppText style={[styles.setCol, styles.setColPrev]}>PRECEDENTE</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>KG</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>REPS</AppText>
          </View>
          {Array.from({ length: targetSets }, (_, index) => {
            const setNumber = index + 1;
            const logged = sets.find((set) => set.setNumber === setNumber);
            const previous = previousSets.find((set) => set.setNumber === setNumber);
            const isNext = !logged && setNumber === nextSetNumber && canLog;
            const isPending = !logged && !isNext;

            return (
              <Pressable
                key={setNumber}
                onPress={() => {
                  if (logged) {
                    openSetEditor(logged);
                  }
                }}
                disabled={locked || !logged || editDraft !== null}
                style={[
                  styles.setRow,
                  logged && styles.setRowDone,
                  isNext && styles.setRowActive,
                  isPending && styles.setRowPending,
                ]}
                accessibilityRole={logged && !locked ? "button" : "text"}
                accessibilityLabel={
                  logged
                    ? `Serie ${setNumber}: ${logged.weightKg ?? "—"} kg × ${logged.reps}`
                    : `Serie ${setNumber} in attesa`
                }
              >
                <AppText tone="heading" style={[styles.setCol, styles.setColSet]}>
                  {setNumber}
                </AppText>
                <AppText style={[styles.setCol, styles.setColPrev, styles.prevText]}>
                  {formatPreviousLabel(previous)}
                </AppText>
                <AppText
                  tone="heading"
                  style={[styles.setCol, styles.setColVal]}
                >
                  {logged
                    ? logged.weightKg == null
                      ? "—"
                      : formatWeightKg(logged.weightKg)
                    : isNext
                      ? weight.trim() === ""
                        ? "—"
                        : weight.trim()
                      : "—"}
                </AppText>
                <AppText
                  tone="heading"
                  style={[styles.setCol, styles.setColVal]}
                >
                  {logged
                    ? String(logged.reps)
                    : isNext
                      ? reps.trim() === ""
                        ? "—"
                        : reps.trim()
                      : "—"}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        Array.from({ length: targetSets }, (_, index) => {
          const setNumber = index + 1;
          const logged = sets.find((set) => set.setNumber === setNumber);
          const plannedReps = getTargetRepsForSet(exercise, setNumber);

          if (logged && !(editDraft && editDraft.setNumber === setNumber)) {
            return (
              <Pressable
                key={setNumber}
                onPress={() => openSetEditor(logged)}
                disabled={locked || editDraft !== null}
                accessibilityRole={locked ? "text" : "button"}
                accessibilityLabel={
                  locked
                    ? `Serie ${setNumber}: ${logged.weightKg ?? "—"} kg per ${logged.reps} reps`
                    : `Modifica serie ${setNumber}`
                }
                style={({ pressed }) => [
                  styles.setLinePressable,
                  pressed && !locked && styles.setLinePressed,
                ]}
              >
                <AppText style={styles.setLine}>
                  #{setNumber}: {logged.weightKg ?? "—"} kg × {logged.reps}{" "}
                  <AppText tone="muted">(piano {plannedReps})</AppText>
                </AppText>
                {!locked ? (
                  <Meta style={styles.editHint}>tocca per modificare</Meta>
                ) : null}
              </Pressable>
            );
          }

          if (!logged) {
            return (
              <AppText key={setNumber} tone="muted" style={styles.setLine}>
                #{setNumber}: in attesa · {plannedReps} reps
              </AppText>
            );
          }

          return null;
        })
      )}

      {editDraft ? (
        <View style={styles.editBlock}>
          <Meta style={styles.nextLabel}>Modifica serie #{editDraft.setNumber}</Meta>
          <StepperRow
            label="kg"
            value={editDraft.weight}
            placeholder="0"
            editing={editing === "weight"}
            inputRef={weightRef}
            keyboardType="decimal-pad"
            large={focus}
            onMinus={() => {
              setEditError(null);
              setEditDraft((current) =>
                current
                  ? {
                      ...current,
                      weight: stepWeightKg(current.weight, -1),
                    }
                  : current,
              );
            }}
            onPlus={() => {
              setEditError(null);
              setEditDraft((current) =>
                current
                  ? {
                      ...current,
                      weight: stepWeightKg(current.weight, 1),
                    }
                  : current,
              );
            }}
            onPressValue={() => startEdit("weight")}
            onChangeText={(value) => {
              setEditError(null);
              setEditDraft((current) =>
                current ? { ...current, weight: value } : current,
              );
            }}
            onEndEditing={() => setEditing(null)}
          />
          <StepperRow
            label="reps"
            value={editDraft.reps}
            placeholder={String(
              getTargetRepsForSet(exercise, editDraft.setNumber),
            )}
            editing={editing === "reps"}
            inputRef={repsRef}
            keyboardType="number-pad"
            large={focus}
            onMinus={() => {
              setEditError(null);
              setEditDraft((current) =>
                current
                  ? { ...current, reps: stepReps(current.reps, -1) }
                  : current,
              );
            }}
            onPlus={() => {
              setEditError(null);
              setEditDraft((current) =>
                current
                  ? { ...current, reps: stepReps(current.reps, 1) }
                  : current,
              );
            }}
            onPressValue={() => startEdit("reps")}
            onChangeText={(value) => {
              setEditError(null);
              setEditDraft((current) =>
                current ? { ...current, reps: value } : current,
              );
            }}
            onEndEditing={() => setEditing(null)}
          />
          {editError ? (
            <AppText
              tone="danger"
              style={styles.editError}
              accessibilityLiveRegion="polite"
            >
              {editError}
            </AppText>
          ) : null}
          <View style={styles.editActions}>
            <Pressable
              onPress={() => {
                setEditError(null);
                setEditDraft(null);
              }}
              disabled={actionsDisabled}
              style={styles.textAction}
              accessibilityRole="button"
              accessibilityLabel="Annulla modifica"
            >
              <Meta>Annulla</Meta>
            </Pressable>
            <Pressable
              onPress={saveSetEditor}
              disabled={actionsDisabled}
              style={[styles.saveEditBtn, actionsDisabled && styles.logBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Salva serie ${editDraft.setNumber}`}
            >
              <AppText style={styles.saveEditLabel}>Salva</AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {complete && !readOnly ? (
        <AppText tone="accent" style={styles.doneLabel}>
          Esercizio completato
        </AppText>
      ) : null}

      {canLog && editDraft === null ? (
        <View style={styles.logBlock}>
          <View style={focus ? styles.stepperPair : undefined}>
            <StepperRow
              label="kg"
              value={weight}
              placeholder="0"
              editing={editing === "weight"}
              inputRef={weightRef}
              keyboardType="decimal-pad"
              large={focus}
              onMinus={() => onStepWeight(-1)}
              onPlus={() => onStepWeight(1)}
              onPressValue={() => startEdit("weight")}
              onChangeText={onChangeWeight}
              onEndEditing={() => setEditing(null)}
            />
            <StepperRow
              label="reps"
              value={reps}
              placeholder={String(targetReps)}
              editing={editing === "reps"}
              inputRef={repsRef}
              keyboardType="number-pad"
              large={focus}
              onMinus={() => onStepReps(-1)}
              onPlus={() => onStepReps(1)}
              onPressValue={() => startEdit("reps")}
              onChangeText={onChangeReps}
              onEndEditing={() => setEditing(null)}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.logBtn,
              (pressed || actionsDisabled) && styles.logBtnPressed,
            ]}
            onPress={onLog}
            disabled={actionsDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: actionsDisabled }}
            accessibilityLabel={`Logga serie ${nextSetNumber}: ${weight || "senza peso"} kg per ${reps || targetReps} reps`}
          >
            <AppText style={styles.logBtnLabel}>
              {focus
                ? `LOG SERIE ${nextSetNumber}`
                : formatLogLabel(weight, reps || String(targetReps), nextSetNumber)}
            </AppText>
            {focus ? (
              <Meta style={styles.logBtnMeta}>
                {weight.trim() === "" ? "—" : weight.trim()} kg ×{" "}
                {reps.trim() === "" ? targetReps : reps.trim()}
              </Meta>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      {canUndo ? (
        <Pressable
          onPress={onUndoLast}
          disabled={actionsDisabled}
          style={[styles.textAction, actionsDisabled && styles.actionDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Annulla ultima serie"
          accessibilityState={{ disabled: actionsDisabled }}
        >
          <Meta style={styles.undoLabel}>Annulla ultima serie</Meta>
        </Pressable>
      ) : null}
      </View>
    </View>
  );
}

type StepperRowProps = {
  label: string;
  value: string;
  placeholder: string;
  editing: boolean;
  inputRef: React.RefObject<TextInputType | null>;
  keyboardType: "decimal-pad" | "number-pad";
  large?: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onPressValue: () => void;
  onChangeText: (value: string) => void;
  onEndEditing: () => void;
};

function StepperRow({
  label,
  value,
  placeholder,
  editing,
  inputRef,
  keyboardType,
  large = false,
  onMinus,
  onPlus,
  onPressValue,
  onChangeText,
  onEndEditing,
}: StepperRowProps) {
  return (
    <View style={[styles.stepperRow, large && styles.stepperRowLarge]}>
      <AppText tone="muted" style={styles.stepperLabel}>
        {label}
      </AppText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onMinus}
          style={({ pressed }) => [
            styles.stepBtn,
            large && styles.stepBtnLarge,
            pressed && styles.stepBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Diminuisci ${label}`}
        >
          <AppText tone="heading" style={styles.stepBtnLabel}>
            −
          </AppText>
        </Pressable>

        {editing ? (
          <TextInput
            ref={inputRef}
            style={[styles.valueInput, large && styles.valueInputLarge]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            keyboardType={keyboardType}
            selectTextOnFocus
            onChangeText={onChangeText}
            onEndEditing={onEndEditing}
            onBlur={onEndEditing}
          />
        ) : (
          <Pressable
            onPress={onPressValue}
            style={[styles.valueTap, large && styles.valueTapLarge]}
            accessibilityRole="button"
            accessibilityLabel={`Modifica ${label}`}
          >
            <AppText
              tone="heading"
              style={[styles.valueText, large && styles.valueTextLarge]}
            >
              {value === "" ? "—" : value}
            </AppText>
          </Pressable>
        )}

        <Pressable
          onPress={onPlus}
          style={({ pressed }) => [
            styles.stepBtn,
            large && styles.stepBtnLarge,
            pressed && styles.stepBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Aumenta ${label}`}
        >
          <AppText tone="heading" style={styles.stepBtnLabel}>
            +
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  cardFocus: {
    marginTop: 0,
    borderRadius: radii.lg,
  },
  cardResting: {
    borderColor: colors.accent,
  },
  cardDone: {
    borderColor: colors.accentBorder,
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
  },
  nameFocus: {
    fontSize: 24,
    lineHeight: 30,
    fontStyle: "italic",
  },
  titleCopy: {
    minWidth: 0,
    gap: 2,
  },
  nameEn: {
    marginTop: 2,
  },
  body: {
    padding: spacing.md,
  },
  bodyFocus: {
    padding: spacing.lg,
  },
  ordinal: {
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  setTable: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    marginBottom: 2,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  setRowDone: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accentBorder,
  },
  setRowActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  setRowPending: {
    opacity: 0.55,
  },
  setCol: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    color: colors.muted,
  },
  setColSet: {
    width: 40,
    color: colors.textHeading,
  },
  setColPrev: {
    flex: 1.4,
  },
  setColVal: {
    flex: 1,
    color: colors.textHeading,
    fontVariant: ["tabular-nums"],
  },
  prevText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.muted,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDone: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentBg,
  },
  chipPending: {
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipNext: {
    borderColor: colors.accent,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textHeading,
  },
  chipLabelPending: {
    color: colors.muted,
    fontWeight: "600",
  },
  chipLabelNext: {
    color: colors.accent,
  },
  setLine: {
    color: colors.text,
    marginTop: 4,
  },
  setLinePressable: {
    marginTop: 4,
  },
  setLinePressed: {
    opacity: 0.7,
  },
  editHint: {
    fontSize: 11,
    marginTop: 2,
  },
  doneLabel: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  logBlock: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  stepperPair: {
    gap: spacing.md,
  },
  editBlock: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.bg,
  },
  nextLabel: {
    fontWeight: "600",
  },
  editError: {
    fontSize: 13,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  saveEditBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveEditLabel: {
    color: colors.onAccent,
    fontWeight: "800",
  },
  textAction: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  undoLabel: {
    color: colors.danger,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  stepperRow: {
    gap: spacing.xs,
  },
  stepperRowLarge: {
    gap: spacing.sm,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnLarge: {
    width: 56,
    height: 56,
  },
  stepBtnPressed: {
    opacity: 0.7,
    borderColor: colors.accent,
  },
  stepBtnLabel: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
  },
  valueTap: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  valueTapLarge: {
    minHeight: 56,
  },
  valueText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  valueTextLarge: {
    fontSize: 34,
    lineHeight: 40,
  },
  valueInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
    color: colors.textHeading,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  valueInputLarge: {
    minHeight: 56,
    fontSize: 34,
  },
  logBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  logBtnPressed: {
    opacity: 0.85,
  },
  logBtnLabel: {
    color: colors.onAccent,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  logBtnMeta: {
    color: colors.onAccent,
    opacity: 0.85,
    fontWeight: "600",
  },
});

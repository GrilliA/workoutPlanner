import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import type { Exercise } from "../../api";
import type { SetSummary } from "../../api/schemas";
import { AppText, BottomSheet, fontForWeight, Meta } from "../../components";
import { colors, radii, shadows, spacing } from "../../theme";
import { exerciseEnglishLine, exerciseHeading } from "../workoutprogram/exerciseDisplay";
import { ExerciseMediaFlip } from "./ExerciseMediaFlip";
import {
  formatSetTargetExtras,
  formatTargetRepsForSet,
  formatWeightKg,
  getTargetRepsForSet,
  getTargetSetCount,
  isExerciseComplete,
  isValidRir,
  stepReps,
  stepRir,
  stepWeightKg,
} from "./logDefaults";

type ExerciseCardProps = {
  exercise: Exercise;
  sets: SetSummary[];
  /** Serie dalla sessione precedente (stesso esercizio), per colonna PRECEDENTE. */
  previousSets?: SetSummary[];
  resting: boolean;
  readOnly: boolean;
  /** Disables log/undo/edit while a set mutation is in flight. */
  busy?: boolean;
  weight: string;
  reps: string;
  /** Reps in reserve for the next set, empty when not logged. */
  rir: string;
  onChangeWeight: (value: string) => void;
  onChangeReps: (value: string) => void;
  onChangeRir: (value: string) => void;
  onLog: () => void;
  onUndoLast: () => void;
  onEditSet: (
    setNumber: number,
    next: { reps: number; weightKg: number | null; rir: number | null },
  ) => void;
  /** Focus mode: larger type, tabella set densità mock. */
  focus?: boolean;
  /** Indice 1-based per eyebrow "ESERCIZIO N DI M". */
  exerciseOrdinal?: number;
  exerciseTotal?: number;
};

type EditingField = "weight" | "reps" | "rir" | null;

type EditDraft = {
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
};

async function tickHaptic() {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Simulator / permissions.
  }
}

function formatRirLabel(rir: number | null): string {
  return rir === null ? "—" : String(rir);
}

function formatPreviousLabel(previous: SetSummary | undefined): string {
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
  rir,
  onChangeWeight,
  onChangeReps,
  onChangeRir,
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
  const [isSetsSheetOpen, setIsSetsSheetOpen] = useState(false);
  const weightRef = useRef<TextInputType>(null);
  const repsRef = useRef<TextInputType>(null);
  const rirRef = useRef<TextInputType>(null);

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
  const nextRirLabel = rir.trim() === "" ? "—" : rir.trim();
  const nextRirSuffix = rir.trim() === "" ? "" : ` · RIR ${rir.trim()}`;
  const nextTargetExtras = formatSetTargetExtras(exercise, nextSetNumber);
  const nextTargetLabel = nextTargetExtras
    ? `${formatTargetRepsForSet(exercise, nextSetNumber)} reps · ${nextTargetExtras}`
    : `${formatTargetRepsForSet(exercise, nextSetNumber)} reps`;

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
      } else if (field === "rir") {
        rirRef.current?.focus();
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

  const onStepRir = (direction: 1 | -1) => {
    if (actionsDisabled) {
      return;
    }
    void tickHaptic();
    onChangeRir(stepRir(rir, direction));
  };

  const openSetEditor = (logged: SetSummary) => {
    if (locked) {
      return;
    }
    setEditError(null);
    setEditDraft({
      setNumber: logged.setNumber,
      weight:
        logged.weightKg === null ? "" : formatWeightKg(logged.weightKg),
      reps: String(logged.reps),
      rir: logged.rir === null ? "" : String(logged.rir),
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
    const rirRaw = editDraft.rir.trim();
    const nextRir = rirRaw === "" ? null : Number(rirRaw);

    if (!Number.isFinite(nextReps) || nextReps <= 0) {
      rejectEditSave("Inserisci un numero di reps valido (maggiore di 0).");
      return;
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      rejectEditSave("Inserisci un peso valido (0 o più).");
      return;
    }

    if (nextRir !== null && !isValidRir(nextRir)) {
      rejectEditSave("Inserisci un RIR valido (da 0 a 10).");
      return;
    }

    setEditError(null);
    onEditSet(editDraft.setNumber, { reps: nextReps, weightKg, rir: nextRir });
    setEditDraft(null);
  };

  const setsTable = (
    <>
      {focus ? (
        <View style={styles.setTable}>
          <View style={styles.setHeader}>
            <AppText style={[styles.setCol, styles.setColSet]}>Serie</AppText>
            <AppText style={[styles.setCol, styles.setColPrev]}>Prima</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>Kg</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>Reps</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>RIR</AppText>
          </View>
          {Array.from({ length: targetSets }, (_, index) => {
            const setNumber = index + 1;
            const logged = sets.find((set) => set.setNumber === setNumber);
            const previous = previousSets.find((set) => set.setNumber === setNumber);
            const isNext = !logged && setNumber === nextSetNumber && canLog;
            const isPending = !logged && !isNext;
            const pendingRirLabel = isNext ? nextRirLabel : "—";
            const rirLabel = logged ? formatRirLabel(logged.rir) : pendingRirLabel;

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
                    ? `Serie ${setNumber}: ${logged.weightKg ?? "—"} kg × ${logged.reps}, RIR ${rirLabel}`
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
                <AppText
                  tone="heading"
                  style={[styles.setCol, styles.setColVal]}
                >
                  {rirLabel}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.setTable}>
          <View style={styles.setHeader}>
            <AppText style={[styles.setCol, styles.setColSet]}>Serie</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>Kg</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>Reps</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>RIR</AppText>
            <AppText style={[styles.setCol, styles.setColVal]}>Piano</AppText>
          </View>
          {[
            ...Array.from({ length: targetSets }, (_, index) => index + 1),
            ...[
              ...new Set(
                sets
                  .filter((set) => set.setNumber > targetSets)
                  .map((set) => set.setNumber),
              ),
            ].sort((a, b) => a - b),
          ].map((setNumber) => {
            if (editDraft && editDraft.setNumber === setNumber) {
              return null;
            }

            const logged = sets.find((set) => set.setNumber === setNumber);
            const plannedReps = getTargetRepsForSet(exercise, setNumber);

            if (!logged) {
              return (
                <View
                  key={setNumber}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`Serie ${setNumber} in attesa`}
                  style={[styles.setRow, styles.summaryRow]}
                >
                  <AppText
                    tone="heading"
                    style={[styles.setCol, styles.setColSet]}
                  >
                    {setNumber}
                  </AppText>
                  <AppText style={[styles.setCol, styles.setColVal]}>—</AppText>
                  <AppText style={[styles.setCol, styles.setColVal]}>—</AppText>
                  <AppText style={[styles.setCol, styles.setColVal]}>—</AppText>
                  <AppText
                    style={[
                      styles.setCol,
                      styles.setColVal,
                      styles.plannedReps,
                    ]}
                  >
                    {formatTargetRepsForSet(exercise, setNumber)}
                  </AppText>
                </View>
              );
            }

            const missed = logged.reps < plannedReps;

            return (
              <Pressable
                key={logged.setNumber}
                onPress={() => openSetEditor(logged)}
                disabled={locked || editDraft !== null}
                accessibilityRole={locked ? "text" : "button"}
                accessibilityLabel={
                  missed
                    ? `Serie ${logged.setNumber}: ${logged.weightKg ?? "—"} kg per ${logged.reps} reps, sotto il piano di ${plannedReps}`
                    : locked
                      ? `Serie ${logged.setNumber}: ${logged.weightKg ?? "—"} kg per ${logged.reps} reps`
                      : `Modifica serie ${logged.setNumber}`
                }
                style={[
                  styles.setRow,
                  styles.summaryRow,
                  missed && styles.setRowMissed,
                ]}
              >
                <AppText
                  tone="heading"
                  style={[styles.setCol, styles.setColSet]}
                >
                  {logged.setNumber}
                </AppText>
                <AppText style={[styles.setCol, styles.setColVal]}>
                  {logged.weightKg == null
                    ? "—"
                    : formatWeightKg(logged.weightKg)}
                </AppText>
                <AppText
                  style={[
                    styles.setCol,
                    styles.setColVal,
                    missed && styles.missedReps,
                  ]}
                >
                  {String(logged.reps)}
                </AppText>
                <AppText style={[styles.setCol, styles.setColVal]}>
                  {formatRirLabel(logged.rir)}
                </AppText>
                <AppText
                  style={[styles.setCol, styles.setColVal, styles.plannedReps]}
                >
                  {formatTargetRepsForSet(exercise, setNumber)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
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
          <StepperRow
            label="rir"
            value={editDraft.rir}
            placeholder=""
            editing={editing === "rir"}
            inputRef={rirRef}
            keyboardType="number-pad"
            large={focus}
            onMinus={() => {
              setEditError(null);
              setEditDraft((current) =>
                current
                  ? { ...current, rir: stepRir(current.rir, -1) }
                  : current,
              );
            }}
            onPlus={() => {
              setEditError(null);
              setEditDraft((current) =>
                current
                  ? { ...current, rir: stepRir(current.rir, 1) }
                  : current,
              );
            }}
            onPressValue={() => startEdit("rir")}
            onChangeText={(value) => {
              setEditError(null);
              setEditDraft((current) =>
                current ? { ...current, rir: value } : current,
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
    </>
  );

  if (!focus) {
    return (
      <View style={[styles.card, complete && styles.cardDone]}>
        <ExerciseMediaFlip
          imageUrl={exercise.imageUrl}
          imageUrlEnd={exercise.imageUrlEnd}
          variant="hero"
          placeholder
        />
        <View style={styles.body}>
          <View style={styles.titleCopy}>
            <AppText tone="heading" style={styles.name}>
              {heading}
            </AppText>
            {english ? <Meta style={styles.nameEn}>{english}</Meta> : null}
          </View>
          {exercise.notes ? <Meta style={styles.notes}>{exercise.notes}</Meta> : null}
          <Meta>
            Serie {Math.min(sets.length, targetSets)} / {targetSets}
          </Meta>
          {setsTable}
        </View>
      </View>
    );
  }

  const badgeLabel = complete
    ? "Esercizio completato"
    : `Serie ${nextSetNumber} di ${targetSets}`;
  const previousForNext =
    previousSets.find((set) => set.setNumber === nextSetNumber) ?? previousSets.at(-1);
  const logMeta = `${weight.trim() === "" ? "—" : weight.trim()} kg × ${
    reps.trim() === "" ? targetReps : reps.trim()
  }${nextRirSuffix}`;

  const closeSetsSheet = () => {
    setEditError(null);
    setEditDraft(null);
    setIsSetsSheetOpen(false);
  };

  return (
    <>
      <View style={[styles.card, styles.cardFocus, resting && styles.cardResting]}>
        <ExerciseMediaFlip
          imageUrl={exercise.imageUrl}
          imageUrlEnd={exercise.imageUrlEnd}
          variant="hero"
          placeholder
        />
        <View style={[styles.body, styles.bodyFocus]}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, complete && styles.badgeDone]}>
              <AppText style={[styles.badgeLabel, complete && styles.badgeLabelDone]}>
                {badgeLabel}
              </AppText>
            </View>
            {exerciseOrdinal != null && exerciseTotal != null ? (
              <Meta>
                Esercizio {exerciseOrdinal} di {exerciseTotal}
              </Meta>
            ) : null}
          </View>
          <View style={styles.titleCopy}>
            <AppText tone="heading" style={[styles.name, styles.nameFocus]}>
              {heading}
            </AppText>
            {english ? <Meta style={styles.nameEn}>{english}</Meta> : null}
          </View>
          {exercise.notes ? <Meta style={styles.notes}>{exercise.notes}</Meta> : null}
          {canLog && previousForNext ? (
            <Meta style={styles.lastTime}>
              Ultima volta: {formatPreviousLabel(previousForNext)}
            </Meta>
          ) : null}
          {canLog ? (
            <AppText tone="accent" style={styles.target}>
              Obiettivo: {nextTargetLabel}
            </AppText>
          ) : null}

          {canLog ? (
            <View style={styles.logBlock}>
              <View style={styles.stepperPair}>
                <StepperRow
                  label="Peso (kg)"
                  value={weight}
                  placeholder="0"
                  editing={editing === "weight"}
                  inputRef={weightRef}
                  keyboardType="decimal-pad"
                  large
                  onMinus={() => onStepWeight(-1)}
                  onPlus={() => onStepWeight(1)}
                  onPressValue={() => startEdit("weight")}
                  onChangeText={onChangeWeight}
                  onEndEditing={() => setEditing(null)}
                />
                <StepperRow
                  label="Ripetizioni"
                  value={reps}
                  placeholder={String(targetReps)}
                  editing={editing === "reps"}
                  inputRef={repsRef}
                  keyboardType="number-pad"
                  large
                  onMinus={() => onStepReps(-1)}
                  onPlus={() => onStepReps(1)}
                  onPressValue={() => startEdit("reps")}
                  onChangeText={onChangeReps}
                  onEndEditing={() => setEditing(null)}
                />
                <StepperRow
                  label="RIR (ripetizioni in riserva)"
                  value={rir}
                  placeholder=""
                  editing={editing === "rir"}
                  inputRef={rirRef}
                  keyboardType="number-pad"
                  onMinus={() => onStepRir(-1)}
                  onPlus={() => onStepRir(1)}
                  onPressValue={() => startEdit("rir")}
                  onChangeText={onChangeRir}
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
                accessibilityLabel={`Serie ${nextSetNumber} fatta: ${weight || "senza peso"} kg per ${reps || targetReps} reps${nextRirSuffix}`}
              >
                <AppText style={styles.logBtnLabel}>Serie fatta</AppText>
                <AppText style={styles.logBtnMeta}>{logMeta}</AppText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.linksRow}>
            <Pressable
              onPress={() => setIsSetsSheetOpen(true)}
              hitSlop={8}
              style={styles.textAction}
              accessibilityRole="button"
            >
              <AppText variant="label" tone="accent" style={styles.linkLabel}>
                Tutte le serie
              </AppText>
            </Pressable>
            {canUndo ? (
              <Pressable
                onPress={onUndoLast}
                disabled={actionsDisabled}
                hitSlop={8}
                style={[styles.textAction, actionsDisabled && styles.actionDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Annulla ultima serie"
                accessibilityState={{ disabled: actionsDisabled }}
              >
                <AppText variant="label" style={styles.undoLabel}>
                  Annulla ultima serie
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <BottomSheet visible={isSetsSheetOpen} onClose={closeSetsSheet} title={heading}>
        <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
          {setsTable}
        </ScrollView>
      </BottomSheet>
    </>
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
      <AppText style={styles.stepperLabel}>
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
            style={[
              styles.valueInput,
              large && styles.valueInputLarge,
              fontForWeight(styles.valueInput),
            ]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.text}
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
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: "hidden",
    marginTop: spacing.sm,
    ...shadows.card,
  },
  cardFocus: {
    marginTop: 0,
    borderRadius: radii.xl,
  },
  cardResting: {
    borderColor: colors.dataBg,
  },
  cardDone: {
    borderColor: colors.accentBorder,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badge: {
    borderRadius: radii.pill,
    backgroundColor: colors.accentBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeDone: {
    backgroundColor: colors.dataBg,
  },
  badgeLabel: {
    color: colors.accentText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  badgeLabelDone: {
    color: colors.data,
  },
  lastTime: {
    marginTop: spacing.sm,
  },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  linkLabel: {
    fontWeight: "700",
  },
  sheetScroll: {
    maxHeight: 480,
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
  },
  nameFocus: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  titleCopy: {
    minWidth: 0,
    gap: 2,
  },
  nameEn: {
    marginTop: 2,
  },
  notes: {
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  target: {
    marginTop: spacing.xs,
    fontWeight: "600",
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
  summaryRow: {
    backgroundColor: colors.bg,
  },
  setRowMissed: {
    borderColor: colors.dangerBorder,
  },
  setCol: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
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
    color: colors.text,
  },
  missedReps: {
    color: colors.danger,
  },
  plannedReps: {
    color: colors.text,
    fontWeight: "600",
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
    color: colors.text,
    fontWeight: "600",
  },
  chipLabelNext: {
    color: colors.accentText,
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
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveEditLabel: {
    color: colors.onAccent,
    fontWeight: "800",
  },
  textAction: {
    minHeight: 44,
    justifyContent: "center",
  },
  actionDisabled: {
    opacity: 0.5,
  },
  undoLabel: {
    color: colors.danger,
    fontWeight: "700",
  },
  stepperRow: {
    gap: spacing.xs,
  },
  stepperRowLarge: {
    gap: spacing.sm,
  },
  stepperLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnLarge: {
    width: 52,
    height: 52,
  },
  stepBtnPressed: {
    backgroundColor: colors.accentBorder,
  },
  stepBtnLabel: {
    color: colors.accentText,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
  },
  valueTap: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
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
    backgroundColor: colors.surface,
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
    borderRadius: radii.pill,
    minHeight: 64,
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
    fontSize: 18,
    lineHeight: 22,
    textAlign: "center",
  },
  logBtnMeta: {
    color: colors.onAccent,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
  },
});

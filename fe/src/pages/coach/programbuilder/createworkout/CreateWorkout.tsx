import { useState } from "react";
import { ConfirmDialog } from "@components/confirmDialog";
import { useUnsavedChangesGuard } from "@utils/useUnsavedChangesGuard";
import { PageHeader } from "../pageheader";
import { WorkoutNameField } from "../workoutnamefield";
import { DaySelector } from "../dayselector";
import { DayNameField } from "../daynamefield";
import { WeekdayPicker } from "../weekdaypicker";
import { ExerciseList } from "../exerciselist";
import { AddExerciseForm } from "../addexerciseform";
import { WorkoutSettingsPanel } from "../workoutsettings";
import {
  useWorkoutDraft,
  useWorkoutForm,
  type WorkoutFormAdapters,
} from "../useCreateWorkout";
import type { WorkoutDraftSeed } from "../workoutForm";
import { SchedaTxtPaste } from "../schedatxt";
import { CoachCardListSkeleton } from "../../coachCard";
import "./style.css";

export type CreateWorkoutProps = {
  workoutId?: number;
  adapters: WorkoutFormAdapters;
  /** Show TXT paste import (new template / blank program flows). */
  enableTxtImport?: boolean;
};

export function CreateWorkout({
  workoutId,
  adapters,
  enableTxtImport = false,
}: CreateWorkoutProps) {
  const { draft, isLoading, notFound } = useWorkoutDraft(workoutId, adapters);

  if (isLoading || notFound) {
    return (
      <div className="create-workout coach-page page-container page-container--wide">
        <PageHeader
          mode={workoutId ? "edit" : "create"}
          onSave={() => undefined}
          isSaveDisabled
          backHref={adapters.backHref}
        />
        {isLoading ? <CoachCardListSkeleton /> : null}
        {notFound ? <p className="coach-empty">Scheda non trovata</p> : null}
      </div>
    );
  }

  return (
    <CreateWorkoutForm
      key={workoutId ?? "new"}
      workoutId={workoutId}
      adapters={adapters}
      enableTxtImport={enableTxtImport}
      initialDraft={draft}
    />
  );
}

function CreateWorkoutForm({
  workoutId,
  adapters,
  enableTxtImport = false,
  initialDraft,
}: CreateWorkoutProps & { initialDraft?: WorkoutDraftSeed | null }) {
  const {
    name,
    setName,
    days,
    activeDay,
    activeDayId,
    setActiveDayId,
    setActiveDayName,
    addDay,
    removeDay,
    moveActiveDay,
    duplicateActiveDay,
    toggleWeekday,
    addExercise,
    updateExercise,
    moveExercise,
    removeExercise,
    settings,
    setSettings,
    nameError,
    formError,
    save,
    applyDraft,
    isSaving,
    isEditMode,
    hasUnsavedChanges,
  } = useWorkoutForm(workoutId, adapters, initialDraft);
  const { isLeaveDialogOpen, leavePage, stayOnPage } =
    useUnsavedChangesGuard(hasUnsavedChanges && !isSaving);
  const [pendingTxtDraft, setPendingTxtDraft] = useState<WorkoutDraftSeed | null>(null);

  // Editing a saved program or a filled form: the TXT would overwrite work, so ask first.
  const txtReplacesWork = isEditMode || hasUnsavedChanges;

  const handleTxtApply = (draft: WorkoutDraftSeed) => {
    if (txtReplacesWork) {
      setPendingTxtDraft(draft);
      return;
    }
    applyDraft(draft);
  };

  const confirmTxtApply = () => {
    if (pendingTxtDraft) {
      applyDraft(pendingTxtDraft);
    }
    setPendingTxtDraft(null);
  };

  const takenWeekdays = days
    .filter((day) => day.clientId !== activeDayId)
    .flatMap((day) => day.weekdays);

  return (
    <div className="create-workout coach-page page-container page-container--wide">
      <PageHeader
        mode={isEditMode ? "edit" : "create"}
        onSave={() => {
          void save();
        }}
        isSaving={isSaving}
        backHref={adapters.backHref}
      />

      {enableTxtImport ? (
        <SchedaTxtPaste onApply={handleTxtApply} />
      ) : null}

      <WorkoutNameField
        value={name}
        onChange={setName}
        error={nameError}
      />

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <DaySelector
        days={days}
        activeDayId={activeDayId}
        onSelect={setActiveDayId}
        onAdd={addDay}
        onRemove={removeDay}
        onMoveActive={moveActiveDay}
        onDuplicateActive={duplicateActiveDay}
      />

      {activeDay ? (
        <>
          <DayNameField
            value={activeDay.name}
            onChange={setActiveDayName}
          />

          <WeekdayPicker
            selected={activeDay.weekdays}
            taken={takenWeekdays}
            onToggle={toggleWeekday}
          />

          <ExerciseList
            key={activeDay.clientId}
            exercises={activeDay.exercises}
            defaultRestSec={settings.defaultRestSec}
            onRemove={removeExercise}
            onMove={moveExercise}
            onUpdate={updateExercise}
          />

          <div className="add-exercise">
            <AddExerciseForm
              defaultRestSec={settings.defaultRestSec}
              onAdd={addExercise}
            />
          </div>
        </>
      ) : null}

      <WorkoutSettingsPanel settings={settings} onChange={setSettings} />

      <ConfirmDialog
        isOpen={isLeaveDialogOpen}
        title="Uscire senza salvare?"
        message="Le modifiche alla scheda andranno perse."
        confirmLabel="Esci senza salvare"
        cancelLabel="Resta"
        onConfirm={leavePage}
        onCancel={stayOnPage}
      />

      <ConfirmDialog
        isOpen={pendingTxtDraft !== null}
        title="Sostituire la scheda?"
        message="Il TXT sostituisce nome, giorni ed esercizi della scheda attuale."
        confirmLabel="Sostituisci"
        onConfirm={confirmTxtApply}
        onCancel={() => setPendingTxtDraft(null)}
      />
    </div>
  );
}

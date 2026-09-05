import { PageHeader } from "../pageheader";
import { WorkoutNameField } from "../workoutnamefield";
import { DaySelector } from "../dayselector";
import { DayNameField } from "../daynamefield";
import { WeekdayPicker } from "../weekdaypicker";
import { ExerciseList } from "../exerciselist";
import { AddExerciseForm } from "../addexerciseform";
import { WorkoutSettingsPanel } from "../workoutsettings";
import { useWorkoutForm, type WorkoutFormAdapters } from "../useCreateWorkout";
import { SchedaTxtPaste } from "../schedatxt";
import type { Weekday } from "../types";
import "./style.css";

export type CreateWorkoutProps = {
  workoutId?: number;
  adapters?: WorkoutFormAdapters;
  /** Show TXT paste import (new template / blank program flows). */
  enableTxtImport?: boolean;
};

export function CreateWorkout({
  workoutId,
  adapters,
  enableTxtImport = false,
}: CreateWorkoutProps) {
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
    toggleWeekday,
    addExercise,
    removeExercise,
    settings,
    setSettings,
    nameError,
    formError,
    save,
    applyDraft,
    isSaving,
    isLoading,
    isEditMode,
    notFound,
  } = useWorkoutForm(workoutId, adapters);

  const takenWeekdays = days
    .filter((day) => day.clientId !== activeDayId)
    .flatMap((day) => day.weekdays);

  return (
    <div className="create-workout coach-page page-container page-container--wide">
      <PageHeader
        mode={isEditMode ? "edit" : "create"}
        onSave={() => {
          if (isLoading || notFound) {
            return;
          }

          void save();
        }}
        isSaving={isSaving}
        backHref={adapters?.backHref ?? adapters?.successPath ?? "/dashboard"}
      />

      {isLoading ? <p>Caricamento scheda…</p> : null}

      {notFound ? <p className="coach-empty">Scheda non trovata</p> : null}

      {isLoading || notFound ? null : (
        <>
          {enableTxtImport ? (
            <SchedaTxtPaste
              onApply={(parsed) =>
                applyDraft({
                  name: parsed.name,
                  settings: parsed.settings,
                  days: parsed.days.map((day) => ({
                    ...day,
                    weekdays: day.weekdays as Weekday[],
                  })),
                })
              }
            />
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
                exercises={activeDay.exercises}
                defaultRestSec={settings.defaultRestSec}
                onRemove={removeExercise}
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
        </>
      )}
    </div>
  );
}

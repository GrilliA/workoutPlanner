import { PageHeader } from "../pageheader";
import { WorkoutNameField } from "../workoutnamefield";
import { ExerciseList } from "../exerciselist";
import { AddExerciseForm } from "../addexerciseform";
import { WorkoutSettingsPanel } from "../workoutsettings";
import { useCreateWorkout } from "../useCreateWorkout";
import "./style.css";

export function CreateWorkout() {
  const {
    name,
    setName,
    exercises,
    addExercise,
    removeExercise,
    settings,
    setSettings,
    nameError,
    formError,
    save,
    isSaving,
  } = useCreateWorkout();

  return (
    <div className="create-workout page-container">
      <PageHeader onSave={() => void save()} isSaving={isSaving} />

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

      <ExerciseList
        exercises={exercises}
        defaultRestSec={settings.defaultRestSec}
        onRemove={removeExercise}
      />

      <div className="add-exercise">
        <AddExerciseForm onAdd={addExercise} />
      </div>

      <WorkoutSettingsPanel settings={settings} onChange={setSettings} />
    </div>
  );
}

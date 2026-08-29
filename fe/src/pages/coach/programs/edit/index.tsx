import { useRoute } from "wouter";
import { AppShell } from "@components/appShell";
import { CreateWorkout } from "@pages/workouts/new/createworkout";
import {
  loadClientProgramDraft,
  saveUpdatedClientProgram,
} from "../../programapi";

export default function EditClientProgramPage() {
  const [, params] = useRoute("/clients/:athleteId/programs/:workoutId/edit");
  const athleteId = Number(params?.athleteId);
  const workoutId = Number(params?.workoutId);

  if (
    !Number.isInteger(athleteId) ||
    athleteId < 1 ||
    !Number.isInteger(workoutId) ||
    workoutId < 1
  ) {
    return null;
  }

  return (
    <AppShell>
      <CreateWorkout
        enableTxtImport
        workoutId={workoutId}
        adapters={{
          loadDraft: () => loadClientProgramDraft(athleteId, workoutId),
          saveUpdate: (id, name, settings, days) =>
            saveUpdatedClientProgram(athleteId, id, name, settings, days),
          successPath: `/clients/${athleteId}`,
          backHref: `/clients/${athleteId}`,
        }}
      />
    </AppShell>
  );
}

import { AppShell } from "@components/appshell";
import { CreateWorkout } from "../new/createworkout";
import { useRoute } from "wouter";

export default function EditWorkoutPage() {
  const [, params] = useRoute("/workouts/:id/edit");
  const workoutId = Number(params?.id);

  if (Number.isNaN(workoutId)) {
    return null;
  }

  return (
    <AppShell>
      <CreateWorkout workoutId={workoutId} />
    </AppShell>
  );
}

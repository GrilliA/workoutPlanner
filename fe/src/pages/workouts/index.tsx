import { AppShell } from "@components/appshell";
import { WorkoutList } from "./list/workoutlist";

export default function WorkoutsPage() {
  return (
    <AppShell>
      <WorkoutList />
    </AppShell>
  );
}

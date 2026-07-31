import { AppShell } from "@components/appshell";
import { CreateWorkout } from "@pages/workouts/new/createworkout";
import { saveNewTemplate } from "../../programapi";

export default function NewTemplatePage() {
  return (
    <AppShell>
      <CreateWorkout
        enableTxtImport
        adapters={{
          saveNew: saveNewTemplate,
          successPath: "/templates",
          backHref: "/templates",
        }}
      />
    </AppShell>
  );
}

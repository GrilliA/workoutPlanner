import { useRoute } from "wouter";
import { CreateWorkout } from "@pages/workouts/new/createworkout";
import { loadTemplateDraft, saveUpdatedTemplate } from "../../programapi";

export default function EditTemplatePage() {
  const [, params] = useRoute("/templates/:id/edit");
  const templateId = Number(params?.id);

  if (!Number.isInteger(templateId) || templateId < 1) {
    return null;
  }

  return (
    <CreateWorkout
      enableTxtImport
      workoutId={templateId}
      adapters={{
        loadDraft: loadTemplateDraft,
        saveUpdate: saveUpdatedTemplate,
        successPath: "/templates",
        backHref: "/templates",
      }}
    />
  );
}

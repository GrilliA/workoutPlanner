import { CreateWorkout } from "@pages/coach/programbuilder/createworkout";
import { saveNewTemplate } from "../../programapi";

export default function NewTemplatePage() {
  return (
    <CreateWorkout
      enableTxtImport
      adapters={{
        saveNew: saveNewTemplate,
        successPath: "/templates",
        backHref: "/templates",
      }}
    />
  );
}

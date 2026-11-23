import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MealPlanTemplate } from "@api";
import {
  addTemplateMeal,
  changeTemplateMeal,
  isTemplateDraftChanged,
  moveTemplateMeal,
  removeTemplateMeal,
  templateDraftFrom,
  templateInputFrom,
} from "./templateDraft.ts";

const template: MealPlanTemplate = {
  id: 4,
  name: "Giornata standard",
  meals: [
    { tagId: 1, name: "Colazione", timeOfDay: "07:30" },
    { tagId: 3, name: "Pranzo", timeOfDay: null },
  ],
  createdAt: "2026-11-20T08:00:00.000Z",
  updatedAt: "2026-11-20T08:00:00.000Z",
};

describe("templateDraftFrom and templateInputFrom", () => {
  it("round-trips a saved template with null for no time", () => {
    assert.deepEqual(templateInputFrom(templateDraftFrom(template)), {
      name: "Giornata standard",
      meals: [
        { tagId: 1, timeOfDay: "07:30" },
        { tagId: 3, timeOfDay: null },
      ],
    });
  });

  it("gives the same keys on every read, so rows keep their state", () => {
    assert.deepEqual(templateDraftFrom(template), templateDraftFrom(template));
  });

  it("starts a new template empty and trims the name", () => {
    const draft = { ...templateDraftFrom(null), name: "  Weekend " };
    assert.deepEqual(templateInputFrom(draft), { name: "Weekend", meals: [] });
  });
});

describe("template draft edits", () => {
  const saved = templateDraftFrom(template);

  it("adds, changes, moves and removes meals without touching the saved draft", () => {
    const added = addTemplateMeal(saved, 5, "new-1");
    const timed = changeTemplateMeal(added, "new-1", { timeOfDay: "20:00" });
    const moved = moveTemplateMeal(timed, 2, 0);

    assert.deepEqual(templateInputFrom(moved).meals, [
      { tagId: 5, timeOfDay: "20:00" },
      { tagId: 1, timeOfDay: "07:30" },
      { tagId: 3, timeOfDay: null },
    ]);
    assert.equal(saved.meals.length, 2);
    assert.equal(isTemplateDraftChanged(moved, saved), true);
    assert.equal(isTemplateDraftChanged(removeTemplateMeal(added, "new-1"), saved), false);
  });
});

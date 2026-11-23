import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MealPlan, MealPlanTemplate } from "@api";
import {
  addItem,
  addMeal,
  applyTemplate,
  changeItem,
  draftFromPlan,
  isDraftChanged,
  mealPlanInputFrom,
  moveItem,
  moveMeal,
  removeMeal,
  type MealPlanDraft,
} from "./mealPlanDraft.ts";

const keyMaker = () => {
  const counter = { value: 0 };
  return () => {
    counter.value += 1;
    return `key-${counter.value}`;
  };
};

const savedPlan: MealPlan = {
  id: 7,
  athleteId: 42,
  isActive: true,
  notes: "Bevi acqua",
  meals: [
    {
      id: 11,
      tagId: 1,
      name: "Colazione",
      timeOfDay: "07:30",
      notes: "Senza zucchero",
      position: 0,
      items: [{ id: 101, food: "Yogurt", quantity: null, position: 0 }],
    },
    { id: 12, tagId: 3, name: "Pranzo", timeOfDay: null, notes: null, position: 1, items: [] },
  ],
  createdAt: "2026-11-20T08:00:00.000Z",
  updatedAt: "2026-11-20T08:00:00.000Z",
};

describe("draftFromPlan and mealPlanInputFrom", () => {
  it("starts empty without a plan", () => {
    assert.deepEqual(draftFromPlan(null, keyMaker()), { notes: "", meals: [] });
  });

  it("sends back every saved id, the meal notes and null for empty texts", () => {
    const input = mealPlanInputFrom(draftFromPlan(savedPlan, keyMaker()));

    assert.deepEqual(input, {
      notes: "Bevi acqua",
      meals: [
        {
          id: 11,
          tagId: 1,
          timeOfDay: "07:30",
          notes: "Senza zucchero",
          items: [{ id: 101, food: "Yogurt", quantity: null }],
        },
        { id: 12, tagId: 3, timeOfDay: null, notes: null, items: [] },
      ],
    });
  });

  it("trims texts and sends new rows without id", () => {
    const createKey = keyMaker();
    const draft = draftFromPlan(savedPlan, createKey);
    const withMeal = addMeal(draft, 5, createKey);
    const newMeal = withMeal.meals[2];
    const withItem = addItem(withMeal, newMeal.key, createKey);
    const newItem = withItem.meals[2].items[0];
    const typed = changeItem(withItem, newMeal.key, newItem.key, { food: "  Riso ", quantity: " " });

    assert.deepEqual(mealPlanInputFrom(typed).meals[2], {
      id: undefined,
      tagId: 5,
      timeOfDay: null,
      notes: null,
      items: [{ id: undefined, food: "Riso", quantity: null }],
    });
  });
});

describe("isDraftChanged", () => {
  it("ignores the React keys and changes undone by hand", () => {
    const saved = draftFromPlan(savedPlan, keyMaker());
    const sameAgain = draftFromPlan(savedPlan, keyMaker());
    const moved = moveMeal(saved, 0, 1);

    assert.equal(isDraftChanged(sameAgain, saved), false);
    assert.equal(isDraftChanged(moved, saved), true);
    assert.equal(isDraftChanged(moveMeal(moved, 1, 0), saved), false);
  });

  it("sees a removed meal", () => {
    const saved = draftFromPlan(savedPlan, keyMaker());
    assert.equal(isDraftChanged(removeMeal(saved, saved.meals[0].key), saved), true);
  });
});

describe("moveItem", () => {
  const withThreeFoods = () => {
    const mealKey = "meal-1";
    const items = ["Riso", "Pollo", "Insalata"].map((food, index) => ({
      key: `item-${index}`,
      food,
      quantity: "",
    }));
    const draft: MealPlanDraft = {
      notes: "",
      meals: [{ key: mealKey, tagId: 1, timeOfDay: "", notes: null, items }],
    };

    return { draft, mealKey };
  };

  const foodsOf = (draft: MealPlanDraft) =>
    draft.meals[0].items.map((item) => item.food);

  it("moves a food inside its meal and the save sends them in that order", () => {
    const { draft, mealKey } = withThreeFoods();
    const moved = moveItem(draft, mealKey, 2, 0);

    assert.deepEqual(foodsOf(moved), ["Insalata", "Riso", "Pollo"]);
    assert.deepEqual(
      mealPlanInputFrom(moved).meals[0].items.map((item) => item.food),
      ["Insalata", "Riso", "Pollo"],
    );
  });

  it("keeps the keys, so the rows are reordered and not recreated", () => {
    const { draft, mealKey } = withThreeFoods();
    const moved = moveItem(draft, mealKey, 0, 1);
    const keysBefore = draft.meals[0].items.map((item) => item.key);

    assert.deepEqual(moved.meals[0].items.map((item) => item.key), [keysBefore[1], keysBefore[0], keysBefore[2]]);
  });

  it("leaves the draft alone for a position out of range or an unknown meal", () => {
    const { draft, mealKey } = withThreeFoods();

    assert.deepEqual(foodsOf(moveItem(draft, mealKey, 0, 3)), ["Riso", "Pollo", "Insalata"]);
    assert.deepEqual(foodsOf(moveItem(draft, "other-meal", 0, 1)), ["Riso", "Pollo", "Insalata"]);
  });
});

describe("applyTemplate", () => {
  const template: MealPlanTemplate = {
    id: 3,
    name: "Giornata standard",
    meals: [
      { tagId: 1, name: "Colazione", timeOfDay: "07:30" },
      { tagId: 4, name: "Merenda", timeOfDay: null },
      { tagId: 3, name: "Pranzo", timeOfDay: null },
      { tagId: 4, name: "Merenda", timeOfDay: "17:00" },
    ],
    createdAt: "2026-11-20T08:00:00.000Z",
    updatedAt: "2026-11-20T08:00:00.000Z",
  };

  it("replaces the meals, keeps the plan notes and skips archived tags", () => {
    const saved = draftFromPlan(savedPlan, keyMaker());
    const applied = applyTemplate(saved, template, [1, 2, 3], keyMaker());

    assert.equal(applied.skippedCount, 2);
    assert.deepEqual(applied.skippedTagNames, ["Merenda"]);
    assert.deepEqual(mealPlanInputFrom(applied.draft), {
      notes: "Bevi acqua",
      meals: [
        { id: undefined, tagId: 1, timeOfDay: "07:30", notes: null, items: [] },
        { id: undefined, tagId: 3, timeOfDay: null, notes: null, items: [] },
      ],
    });
  });

  it("skips nothing when every tag is live", () => {
    const applied = applyTemplate(draftFromPlan(null, keyMaker()), template, [1, 3, 4], keyMaker());

    assert.equal(applied.skippedCount, 0);
    assert.equal(applied.draft.meals.length, 4);
  });
});

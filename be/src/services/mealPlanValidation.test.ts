import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findForeignMealPlanId,
  usesUnavailableMealTag,
  validateMealLogsQuery,
  validateMealPlanInput,
  validateMealPlanPatch,
  validateMealPlanTemplateInput,
  validateMealTagInput,
  validateMealTagPatch,
  type MealPlanInput,
} from "./mealPlanValidation";

const invalid = (error: string) => ({ ok: false, error });
const text = (length: number): string => "a".repeat(length);

const item = (fields: Record<string, unknown> = {}) => ({ food: "Avena", quantity: "80 g", ...fields });
const meal = (fields: Record<string, unknown> = {}) => ({ tagId: 1, items: [item()], ...fields });
const planWith = (fields: Record<string, unknown> = {}) => ({ meals: [meal()], ...fields });
const mealsBody = (meals: unknown[]) => ({ meals });
const itemsBody = (items: unknown[]) => mealsBody([meal({ items })]);

describe("validateMealPlanInput", () => {
  it("refuses a body that is not a JSON object", () => {
    for (const body of [undefined, null, [], 5, "text", true]) {
      assert.deepEqual(validateMealPlanInput(body), invalid("Invalid request body"));
    }
  });

  it("trims texts, turns blank optional texts into null and keeps the array order", () => {
    const parsed = validateMealPlanInput({
      notes: "   ",
      meals: [
        { id: 4, tagId: 3, timeOfDay: "13:00", notes: " riso ", items: [{ id: 9, food: " Riso ", quantity: "" }] },
        { tagId: 5, items: [] },
      ],
    });

    assert.deepEqual(parsed, {
      ok: true,
      value: {
        notes: null,
        meals: [
          {
            id: 4,
            tagId: 3,
            timeOfDay: "13:00",
            notes: "riso",
            items: [{ id: 9, food: "Riso", quantity: null }],
          },
          { id: undefined, tagId: 5, timeOfDay: null, notes: null, items: [] },
        ],
      },
    });
  });

  it("refuses a plan with no meals", () => {
    assert.deepEqual(validateMealPlanInput({ meals: [] }), invalid("meals must have at least 1 entry"));
  });

  it("requires the arrays", () => {
    assert.deepEqual(validateMealPlanInput({}), invalid("meals must be an array"));
    assert.deepEqual(validateMealPlanInput(mealsBody([{ tagId: 1 }])), invalid("meals.items must be an array"));
    assert.deepEqual(validateMealPlanInput(mealsBody([5])), invalid("Invalid request body"));
    assert.deepEqual(validateMealPlanInput(itemsBody([null])), invalid("Invalid request body"));
  });

  it("caps meals per plan at 12 and items per meal at 30", () => {
    const twelveMeals = Array.from({ length: 12 }, () => meal());
    const thirtyItems = Array.from({ length: 30 }, () => item());

    assert.equal(validateMealPlanInput(mealsBody(twelveMeals)).ok, true);
    assert.deepEqual(
      validateMealPlanInput(mealsBody([...twelveMeals, meal()])),
      invalid("meals must have at most 12 entries"),
    );
    assert.equal(validateMealPlanInput(itemsBody(thirtyItems)).ok, true);
    assert.deepEqual(
      validateMealPlanInput(itemsBody([...thirtyItems, item()])),
      invalid("meals.items must have at most 30 entries"),
    );
  });

  it("caps every text at its length, counted after trimming", () => {
    const cases: [unknown, number, string][] = [
      [planWith({ notes: text(1001) }), 1000, "notes"],
      [mealsBody([meal({ notes: text(501) })]), 500, "meals.notes"],
      [itemsBody([item({ food: text(121) })]), 120, "meals.items.food"],
      [itemsBody([item({ quantity: text(61) })]), 60, "meals.items.quantity"],
    ];

    for (const [body, maxLength, field] of cases) {
      assert.deepEqual(validateMealPlanInput(body), invalid(`${field} must be at most ${maxLength} characters`));
    }

    const atTheLimit = {
      notes: text(1000),
      meals: [meal({ notes: ` ${text(500)} `, items: [item({ food: text(120), quantity: text(60) })] })],
    };
    assert.equal(validateMealPlanInput(atTheLimit).ok, true);
  });

  it("requires a meal tag id and a food", () => {
    assert.deepEqual(validateMealPlanInput(mealsBody([meal({ tagId: undefined })])), invalid("meals.tagId is required"));
    assert.deepEqual(validateMealPlanInput(mealsBody([meal({ tagId: null })])), invalid("meals.tagId is required"));
    assert.deepEqual(validateMealPlanInput(itemsBody([item({ food: undefined })])), invalid("meals.items.food is required"));
  });

  it("refuses a meal tag id that is not a database id, and ignores a name", () => {
    for (const tagId of ["3", 0, -2, 1.5, 2_147_483_648, true]) {
      assert.deepEqual(validateMealPlanInput(mealsBody([meal({ tagId })])), invalid("Invalid meal tag id"), String(tagId));
    }

    const withName = validateMealPlanInput(mealsBody([meal({ name: "Pranzo" })]));
    assert.equal(withName.ok, true);
    assert.equal(withName.ok && "name" in withName.value.meals[0], false, "a meal has no name of its own");
  });

  it("refuses optional texts of the wrong type", () => {
    assert.deepEqual(validateMealPlanInput(planWith({ notes: 5 })), invalid("notes must be a string or null"));
    assert.deepEqual(validateMealPlanInput(mealsBody([meal({ notes: [] })])), invalid("meals.notes must be a string or null"));
    assert.deepEqual(
      validateMealPlanInput(itemsBody([item({ quantity: 80 })])),
      invalid("meals.items.quantity must be a string or null"),
    );
  });

  it("refuses the NUL character, which Postgres would reject with a 500", () => {
    assert.deepEqual(validateMealPlanInput(planWith({ notes: "a\0b" })), invalid("notes must not contain a NUL character"));
    assert.deepEqual(
      validateMealPlanInput(mealsBody([meal({ notes: "a\0b" })])),
      invalid("meals.notes must not contain a NUL character"),
    );
    assert.deepEqual(
      validateMealPlanInput(itemsBody([item({ food: "a\0b" })])),
      invalid("meals.items.food must not contain a NUL character"),
    );
  });

  it("accepts HH:MM from 00:00 to 23:59 and null as the time of day", () => {
    for (const timeOfDay of ["00:00", "07:30", "23:59", null, undefined]) {
      assert.equal(validateMealPlanInput(mealsBody([meal({ timeOfDay })])).ok, true, String(timeOfDay));
    }

    for (const timeOfDay of ["24:00", "7:30", "07:60", "07:30:00", "", 730]) {
      assert.deepEqual(
        validateMealPlanInput(mealsBody([meal({ timeOfDay })])),
        invalid("meals.timeOfDay must be HH:MM or null"),
        String(timeOfDay),
      );
    }
  });

  it("refuses ids that are not database ids", () => {
    for (const id of [0, -1, 1.5, "4", null, 2_147_483_648]) {
      assert.deepEqual(validateMealPlanInput(mealsBody([meal({ id })])), invalid("Invalid meal id"));
      assert.deepEqual(validateMealPlanInput(itemsBody([item({ id })])), invalid("Invalid meal item id"));
    }
  });

  it("refuses the same id sent twice", () => {
    assert.deepEqual(
      validateMealPlanInput(mealsBody([meal({ id: 3 }), meal({ id: 3 })])),
      invalid("Duplicate meal id"),
    );
    assert.deepEqual(
      validateMealPlanInput(mealsBody([meal({ id: 3, items: [item({ id: 7 })] }), meal({ id: 4, items: [item({ id: 7 })] })])),
      invalid("Duplicate meal item id"),
    );
  });
});

describe("validateMealPlanPatch", () => {
  it("takes a boolean isActive", () => {
    assert.deepEqual(validateMealPlanPatch({ isActive: false }), { ok: true, value: { isActive: false } });
    assert.deepEqual(validateMealPlanPatch({ isActive: true, notes: "x" }), { ok: true, value: { isActive: true } });
  });

  it("refuses anything else", () => {
    assert.deepEqual(validateMealPlanPatch(null), invalid("Invalid request body"));
    assert.deepEqual(validateMealPlanPatch({}), invalid("isActive must be a boolean"));
    assert.deepEqual(validateMealPlanPatch({ isActive: "true" }), invalid("isActive must be a boolean"));
  });
});

describe("validateMealLogsQuery", () => {
  it("accepts up to 31 days, both ends included", () => {
    assert.deepEqual(validateMealLogsQuery({ from: "2026-11-01", to: "2026-12-01" }), {
      ok: true,
      value: { from: "2026-11-01", to: "2026-12-01" },
    });
    assert.equal(validateMealLogsQuery({ from: "2026-11-13", to: "2026-11-13" }).ok, true);
  });

  it("refuses 32 days", () => {
    assert.deepEqual(
      validateMealLogsQuery({ from: "2026-11-01", to: "2026-12-02" }),
      invalid("Range must be at most 31 days"),
    );
  });

  it("refuses bad or inverted dates", () => {
    assert.deepEqual(validateMealLogsQuery({ to: "2026-11-13" }), invalid("from must be YYYY-MM-DD"));
    assert.deepEqual(validateMealLogsQuery({ from: "2026-02-30", to: "2026-03-01" }), invalid("from must be YYYY-MM-DD"));
    assert.deepEqual(validateMealLogsQuery({ from: "2026-11-01", to: ["2026-11-02"] }), invalid("to must be YYYY-MM-DD"));
    assert.deepEqual(validateMealLogsQuery({ from: "2026-11-01", to: "2199-01-01" }), invalid("to must be YYYY-MM-DD"));
    assert.deepEqual(
      validateMealLogsQuery({ from: "2026-11-13", to: "2026-11-12" }),
      invalid("to must be on or after from"),
    );
  });
});

describe("findForeignMealPlanId", () => {
  const savedMeals = [
    { id: 1, tagId: 5, itemIds: [10, 11] },
    { id: 2, tagId: 6, itemIds: [20] },
  ];
  const input = (meals: MealPlanInput["meals"]): MealPlanInput => ({ notes: null, meals });
  const mealInput = (id: number | undefined, itemIds: (number | undefined)[]) => ({
    id,
    tagId: 5,
    timeOfDay: null,
    notes: null,
    items: itemIds.map((itemId) => ({ id: itemId, food: "Cibo", quantity: null })),
  });

  it("is null when every id is a row of the plan, and for new rows", () => {
    assert.equal(findForeignMealPlanId(input([mealInput(1, [10, undefined]), mealInput(undefined, [undefined])]), savedMeals), null);
  });

  it("finds a meal id that is not in the plan", () => {
    assert.equal(findForeignMealPlanId(input([mealInput(99, [])]), savedMeals), "Meal not found");
  });

  it("finds any id when there is no plan yet", () => {
    assert.equal(findForeignMealPlanId(input([mealInput(1, [])]), []), "Meal not found");
  });

  it("finds an item id sent with another meal of the same plan", () => {
    assert.equal(findForeignMealPlanId(input([mealInput(1, [20])]), savedMeals), "Meal item not found");
  });

  it("finds an item id sent inside a new meal", () => {
    assert.equal(findForeignMealPlanId(input([mealInput(undefined, [10])]), savedMeals), "Meal item not found");
  });

  it("finds an item id that is not in the plan at all", () => {
    assert.equal(findForeignMealPlanId(input([mealInput(2, [999])]), savedMeals), "Meal item not found");
  });
});

describe("usesUnavailableMealTag", () => {
  const live = (id: number) => ({ id, isArchived: false });
  const archived = (id: number) => ({ id, isArchived: true });

  it("is false when every tag is a live tag of the coach, even used twice", () => {
    assert.equal(usesUnavailableMealTag({ sentTagIds: [1, 2, 1], storedTagIds: [], coachTags: [live(1), live(2)] }), false);
  });

  it("is true for a tag the coach does not have: another coach's or missing", () => {
    assert.equal(usesUnavailableMealTag({ sentTagIds: [1, 9], storedTagIds: [9], coachTags: [live(1)] }), true);
  });

  it("keeps an archived tag where the stored plan already had it", () => {
    assert.equal(usesUnavailableMealTag({ sentTagIds: [3, 1], storedTagIds: [1, 3], coachTags: [archived(3), live(1)] }), false);
    assert.equal(usesUnavailableMealTag({ sentTagIds: [1], storedTagIds: [1, 3], coachTags: [live(1)] }), false);
  });

  it("refuses a new meal with an archived tag", () => {
    assert.equal(usesUnavailableMealTag({ sentTagIds: [3], storedTagIds: [], coachTags: [archived(3)] }), true);
    assert.equal(usesUnavailableMealTag({ sentTagIds: [3, 3], storedTagIds: [3], coachTags: [archived(3)] }), true);
  });
});

describe("validateMealTagInput", () => {
  it("trims the name and caps it at 60", () => {
    assert.deepEqual(validateMealTagInput({ name: "  Pre-nanna " }), { ok: true, value: { name: "Pre-nanna" } });
    assert.equal(validateMealTagInput({ name: text(60) }).ok, true);
    assert.deepEqual(validateMealTagInput({ name: text(61) }), invalid("name must be at most 60 characters"));
  });

  it("refuses a missing, blank or NUL name and a body that is not an object", () => {
    assert.deepEqual(validateMealTagInput({}), invalid("name is required"));
    assert.deepEqual(validateMealTagInput({ name: "   " }), invalid("name is required"));
    assert.deepEqual(validateMealTagInput({ name: "a\0b" }), invalid("name must not contain a NUL character"));
    assert.deepEqual(validateMealTagInput([]), invalid("Invalid request body"));
  });
});

describe("validateMealTagPatch", () => {
  it("takes any of name, position and archived", () => {
    assert.deepEqual(validateMealTagPatch({ name: " Brunch " }), {
      ok: true,
      value: { name: "Brunch", position: undefined, archived: undefined },
    });
    assert.deepEqual(validateMealTagPatch({ position: 0 }), {
      ok: true,
      value: { name: undefined, position: 0, archived: undefined },
    });
    assert.deepEqual(validateMealTagPatch({ archived: true, position: 29 }), {
      ok: true,
      value: { name: undefined, position: 29, archived: true },
    });
  });

  it("refuses an empty patch, a bad position and archived false", () => {
    assert.deepEqual(validateMealTagPatch({}), invalid("At least one field is required"));
    for (const position of [-1, 30, 1.5, "2", null]) {
      assert.deepEqual(
        validateMealTagPatch({ position }),
        invalid("position must be an integer from 0 to 29"),
        String(position),
      );
    }
    assert.deepEqual(validateMealTagPatch({ archived: false }), invalid("archived must be true"));
    assert.deepEqual(validateMealTagPatch({ name: "" }), invalid("name is required"));
    assert.deepEqual(validateMealTagPatch(null), invalid("Invalid request body"));
  });
});

describe("validateMealPlanTemplateInput", () => {
  const templateMeal = (fields: Record<string, unknown> = {}) => ({ tagId: 1, ...fields });

  it("takes a trimmed name and the ordered meals, tag and optional time only", () => {
    assert.deepEqual(
      validateMealPlanTemplateInput({
        name: " Giornata standard ",
        meals: [templateMeal({ timeOfDay: "07:30", items: [item()] }), templateMeal({ tagId: 3 })],
      }),
      {
        ok: true,
        value: {
          name: "Giornata standard",
          meals: [
            { tagId: 1, timeOfDay: "07:30" },
            { tagId: 3, timeOfDay: null },
          ],
        },
      },
    );
  });

  it("needs a name, from 1 to 12 meals and a tag per meal", () => {
    const meals = [templateMeal()];
    assert.deepEqual(validateMealPlanTemplateInput({ meals }), invalid("name is required"));
    assert.deepEqual(validateMealPlanTemplateInput({ name: text(61), meals }), invalid("name must be at most 60 characters"));
    assert.deepEqual(validateMealPlanTemplateInput({ name: "T" }), invalid("meals must be an array"));
    assert.deepEqual(validateMealPlanTemplateInput({ name: "T", meals: [] }), invalid("meals must have at least 1 entry"));
    assert.equal(validateMealPlanTemplateInput({ name: "T", meals: Array.from({ length: 12 }, () => templateMeal()) }).ok, true);
    assert.deepEqual(
      validateMealPlanTemplateInput({ name: "T", meals: Array.from({ length: 13 }, () => templateMeal()) }),
      invalid("meals must have at most 12 entries"),
    );
    assert.deepEqual(validateMealPlanTemplateInput({ name: "T", meals: [{}] }), invalid("meals.tagId is required"));
    assert.deepEqual(validateMealPlanTemplateInput({ name: "T", meals: [templateMeal({ tagId: "1" })] }), invalid("Invalid meal tag id"));
    assert.deepEqual(
      validateMealPlanTemplateInput({ name: "T", meals: [templateMeal({ timeOfDay: "7:30" })] }),
      invalid("meals.timeOfDay must be HH:MM or null"),
    );
    assert.deepEqual(validateMealPlanTemplateInput({ name: "T", meals: [5] }), invalid("Invalid request body"));
    assert.deepEqual(validateMealPlanTemplateInput("T"), invalid("Invalid request body"));
  });
});

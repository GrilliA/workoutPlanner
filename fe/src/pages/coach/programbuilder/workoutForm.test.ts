import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NewExerciseInput } from "./types.ts";
import {
  addDay,
  addExercise,
  checkBeforeSave,
  createWorkoutForm,
  findActiveDay,
  findExerciseInputError,
  removeDay,
  removeExercise,
  renameActiveDay,
  toggleWeekday,
} from "./workoutForm.ts";

const benchPress: NewExerciseInput = {
  name: "  Panca piana  ",
  catalogId: null,
  setPrescriptions: [
    { setNumber: 1, reps: 10, restSec: 90 },
    { setNumber: 2, reps: 8, restSec: 120 },
  ],
};

const formWithTwoDays = () => addDay(createWorkoutForm(), "day-2");

describe("createWorkoutForm", () => {
  it("starts a new workout with one empty day selected", () => {
    const form = createWorkoutForm();

    assert.equal(form.name, "");
    assert.equal(form.days.length, 1);
    assert.equal(form.activeDayId, form.days[0]?.clientId);
    assert.equal(form.isSaving, false);
  });

  it("reindexes the days of a loaded draft and selects the first", () => {
    const loaded = formWithTwoDays();
    const form = createWorkoutForm({
      name: "Upper Lower",
      settings: loaded.settings,
      days: [...loaded.days].reverse(),
    });

    assert.deepEqual(
      form.days.map((day) => day.sortOrder),
      [0, 1],
    );
    assert.equal(form.activeDayId, "day-2");
  });
});

describe("days", () => {
  it("adds a day and selects it", () => {
    const form = formWithTwoDays();

    assert.equal(form.days.length, 2);
    assert.equal(form.activeDayId, "day-2");
    assert.equal(form.days[1]?.name, "Giorno 2");
  });

  it("removing the active day selects the first one", () => {
    const form = removeDay(formWithTwoDays(), "day-2");

    assert.equal(form.days.length, 1);
    assert.equal(form.activeDayId, form.days[0]?.clientId);
  });

  it("never removes the last day", () => {
    const form = createWorkoutForm();
    const onlyDayId = form.days[0]?.clientId ?? "";

    assert.equal(removeDay(form, onlyDayId), form);
  });

  it("renames only the active day", () => {
    const form = renameActiveDay(formWithTwoDays(), "Gambe");

    assert.equal(form.days[0]?.name, "Giorno 1");
    assert.equal(form.days[1]?.name, "Gambe");
  });
});

describe("toggleWeekday", () => {
  it("adds and removes a weekday on the active day", () => {
    const afterAdd = toggleWeekday(toggleWeekday(createWorkoutForm(), 4), 0);
    const afterRemove = toggleWeekday(afterAdd, 4);

    assert.deepEqual(findActiveDay(afterAdd).weekdays, [0, 4]);
    assert.deepEqual(findActiveDay(afterRemove).weekdays, [0]);
  });

  it("refuses a weekday taken by another day and explains why", () => {
    const firstDayOnMonday = toggleWeekday(createWorkoutForm(), 0);
    const secondDay = addDay(firstDayOnMonday, "day-2");
    const form = toggleWeekday(secondDay, 0);

    assert.deepEqual(findActiveDay(form).weekdays, []);
    assert.equal(form.formError, "Giorno 1 è già programmato di lunedì");
  });
});

describe("exercises", () => {
  it("rejects an exercise without a name or with invalid sets", () => {
    assert.equal(
      findExerciseInputError({ ...benchPress, name: " " }),
      "Il nome dell'esercizio è obbligatorio",
    );
    assert.equal(
      findExerciseInputError({ ...benchPress, setPrescriptions: [] }),
      "Aggiungi almeno una serie",
    );
    assert.equal(
      findExerciseInputError({
        ...benchPress,
        setPrescriptions: [{ setNumber: 1, reps: 0, restSec: 90 }],
      }),
      "Ogni serie deve avere reps e recupero validi",
    );
    assert.equal(findExerciseInputError(benchPress), null);
  });

  it("adds a trimmed exercise to the active day and removes it", () => {
    const afterAdd = addExercise(formWithTwoDays(), benchPress, "exercise-1");
    const afterRemove = removeExercise(afterAdd, "exercise-1");

    assert.equal(afterAdd.days[0]?.exercises.length, 0);
    assert.equal(findActiveDay(afterAdd).exercises[0]?.name, "Panca piana");
    assert.equal(findActiveDay(afterRemove).exercises.length, 0);
  });
});

describe("checkBeforeSave", () => {
  it("requires a workout name", () => {
    const saveCheck = checkBeforeSave(createWorkoutForm());

    assert.equal(saveCheck.isValid, false);
    if (saveCheck.isValid) {
      return;
    }
    assert.equal(saveCheck.form.nameError, "Il nome della scheda è obbligatorio");
  });

  it("selects the first day without a name", () => {
    const named = { ...formWithTwoDays(), name: "Scheda" };
    const unnamedFirstDay = {
      ...named,
      days: named.days.map((day, index) => (index === 0 ? { ...day, name: " " } : day)),
    };
    const saveCheck = checkBeforeSave(unnamedFirstDay);

    assert.equal(saveCheck.isValid, false);
    if (saveCheck.isValid) {
      return;
    }
    assert.equal(saveCheck.form.activeDayId, named.days[0]?.clientId);
    assert.equal(saveCheck.form.formError, "Ogni giorno di allenamento deve avere un nome");
  });

  it("returns trimmed names when the form is valid", () => {
    const form = renameActiveDay(
      { ...createWorkoutForm(), name: "  Scheda forza  " },
      "  Upper  ",
    );
    const saveCheck = checkBeforeSave(form);

    assert.equal(saveCheck.isValid, true);
    if (!saveCheck.isValid) {
      return;
    }
    assert.equal(saveCheck.name, "Scheda forza");
    assert.equal(saveCheck.days[0]?.name, "Upper");
  });
});

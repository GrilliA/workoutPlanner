import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NewExerciseInput } from "./types.ts";
import {
  addDay,
  addExercise,
  checkBeforeSave,
  createWorkoutForm,
  duplicateActiveDay,
  findActiveDay,
  findExerciseInputError,
  hasUnsavedChanges,
  moveActiveDay,
  moveExercise,
  removeDay,
  removeExercise,
  renameActiveDay,
  toggleWeekday,
  updateExercise,
} from "./workoutForm.ts";

const benchPress: NewExerciseInput = {
  name: "  Panca piana  ",
  catalogId: null,
  setPrescriptions: [
    { setNumber: 1, reps: 10, restSec: 90 },
    { setNumber: 2, reps: 8, restSec: 120 },
  ],
};

const squat: NewExerciseInput = {
  name: "Squat",
  catalogId: "squat",
  setPrescriptions: [{ setNumber: 1, reps: 5, restSec: 180 }],
};

const formWithTwoDays = () => addDay(createWorkoutForm(), "day-2");

const formWithTwoExercises = () =>
  addExercise(addExercise(createWorkoutForm(), benchPress, "bench"), squat, "squat");

const exerciseIds = (form: ReturnType<typeof createWorkoutForm>) =>
  findActiveDay(form).exercises.map((exercise) => exercise.clientId);

const createCountingIds = () => {
  const ids = ["copy-1", "copy-2", "copy-3"];
  return () => ids.shift() ?? "copy-extra";
};

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

describe("moving and duplicating days", () => {
  it("moves the active day earlier and keeps sortOrder in sync", () => {
    const form = moveActiveDay(formWithTwoDays(), "earlier");

    assert.equal(form.days[0]?.clientId, "day-2");
    assert.deepEqual(
      form.days.map((day) => day.sortOrder),
      [0, 1],
    );
  });

  it("does nothing when the active day is already last", () => {
    const form = formWithTwoDays();

    assert.deepEqual(moveActiveDay(form, "later").days, form.days);
  });

  it("copies the active day after it, without weekdays or server ids", () => {
    const onMonday = toggleWeekday(formWithTwoExercises(), 0);
    const original = findActiveDay(onMonday);
    const withServerIds = {
      ...onMonday,
      days: [{ ...original, serverId: 7, name: "Upper" }],
    };
    const form = duplicateActiveDay(withServerIds, createCountingIds());
    const copy = form.days[1];

    assert.equal(form.days.length, 2);
    assert.equal(form.activeDayId, "copy-1");
    assert.equal(copy?.name, "Upper (copia)");
    assert.equal(copy?.serverId, undefined);
    assert.deepEqual(copy?.weekdays, []);
    assert.deepEqual(
      copy?.exercises.map((exercise) => exercise.clientId),
      ["copy-2", "copy-3"],
    );
    assert.deepEqual(
      copy?.exercises.map((exercise) => exercise.name),
      ["Panca piana", "Squat"],
    );
  });

  it("names the copy of an unnamed day after its chip label", () => {
    const unnamed = renameActiveDay(createWorkoutForm(), "   ");
    const form = duplicateActiveDay(unnamed, createCountingIds());

    assert.equal(form.days[1]?.name, "Giorno 1 (copia)");
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

describe("editing and moving exercises", () => {
  it("moves an exercise up and down within the day", () => {
    const movedUp = moveExercise(formWithTwoExercises(), "squat", "earlier");
    const movedBack = moveExercise(movedUp, "squat", "later");

    assert.deepEqual(exerciseIds(movedUp), ["squat", "bench"]);
    assert.deepEqual(exerciseIds(movedBack), ["bench", "squat"]);
  });

  it("does nothing when the first exercise moves earlier", () => {
    const form = formWithTwoExercises();

    assert.deepEqual(exerciseIds(moveExercise(form, "bench", "earlier")), ["bench", "squat"]);
  });

  it("updates an exercise in place and keeps its ids", () => {
    const loaded = formWithTwoExercises();
    const activeDay = findActiveDay(loaded);
    const withServerId = {
      ...loaded,
      days: [
        {
          ...activeDay,
          exercises: activeDay.exercises.map((exercise) => ({ ...exercise, serverId: 42 })),
        },
      ],
    };
    const form = updateExercise(withServerId, "bench", { ...squat, name: " Stacco " });
    const updated = findActiveDay(form).exercises[0];

    assert.equal(updated?.clientId, "bench");
    assert.equal(updated?.serverId, 42);
    assert.equal(updated?.name, "Stacco");
    assert.equal(updated?.setPrescriptions.length, 1);
  });
});

describe("hasUnsavedChanges", () => {
  it("is false until something that gets saved changes", () => {
    const initialForm = formWithTwoDays();
    const onlySelectionAndError = {
      ...initialForm,
      activeDayId: initialForm.days[0]?.clientId ?? "",
      formError: "errore",
    };

    assert.equal(hasUnsavedChanges(onlySelectionAndError, initialForm), false);
    assert.equal(hasUnsavedChanges(renameActiveDay(initialForm, "Gambe"), initialForm), true);
  });

  it("is false again when a change is undone", () => {
    const initialForm = formWithTwoExercises();
    const movedAndBack = moveExercise(
      moveExercise(initialForm, "squat", "earlier"),
      "squat",
      "later",
    );

    assert.equal(hasUnsavedChanges(movedAndBack, initialForm), false);
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

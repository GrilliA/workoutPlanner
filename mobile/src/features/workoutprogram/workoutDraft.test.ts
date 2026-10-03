import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Exercise, WorkoutDay, WorkoutDetail } from "../../api/schemas";
import type { CatalogExercise } from "../../api/schemas/catalog";
import type { ParsedScheda } from "../../schedatxt/parseSchedaTxt";
import {
  emptyWorkoutDraft,
  newWorkoutDraftDay,
  toWorkoutProgramInput,
  validateWorkoutDraft,
  workoutDraftExerciseFromCatalog,
  workoutDraftFromSchedaTxt,
  workoutDraftFromServer,
  type WorkoutDraft,
  type WorkoutDraftExercise,
} from "./workoutDraft";

const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 1,
  name: "Bench Press",
  sets: 3,
  reps: 10,
  workoutId: 7,
  workoutDayId: 11,
  catalogId: null,
  nameIt: null,
  nameEn: null,
  imageUrl: null,
  imageUrlEnd: null,
  setPrescriptions: [],
  ...overrides,
});

const makeDay = (overrides: Partial<WorkoutDay> = {}): WorkoutDay => ({
  id: 11,
  workoutId: 7,
  name: "Giorno 1",
  sortOrder: 0,
  weekdays: [0],
  exerciseCount: 0,
  ...overrides,
});

const makeDetail = (overrides: Partial<WorkoutDetail> = {}): WorkoutDetail => ({
  id: 7,
  name: "Scheda A",
  defaultRestSec: 90,
  workoutType: "Forza + Ipertrofia",
  frequency: "3× a settimana",
  isActive: true,
  createdAt: new Date("2026-01-01"),
  exerciseCount: 0,
  ...overrides,
});

const makeDraftExercise = (
  overrides: Partial<WorkoutDraftExercise> = {},
): WorkoutDraftExercise => ({
  key: "ex-1",
  catalogId: null,
  name: "Panca piana",
  nameIt: null,
  nameEn: null,
  imageUrl: null,
  imageUrlEnd: null,
  prescriptions: [
    { key: "s1", reps: "10", restSec: 90 },
    { key: "s2", reps: "8", restSec: 120 },
  ],
  ...overrides,
});

const makeDraft = (
  days: WorkoutDraft["days"],
  overrides: Partial<WorkoutDraft> = {},
): WorkoutDraft => ({
  name: "  Scheda A  ",
  defaultRestSec: 90,
  workoutType: "Forza + Ipertrofia",
  days,
  ...overrides,
});

describe("toWorkoutProgramInput", () => {
  it("trims names, maps sortOrder and setNumber, keeps ids only when defined", () => {
    const dayWithId = {
      key: "d1",
      id: 11,
      name: "  Upper  ",
      weekdays: [0],
      exercises: [
        makeDraftExercise({ id: 5, catalogId: "Barbell_Bench_Press" }),
        makeDraftExercise({ key: "ex-2", name: "Rematore" }),
      ],
    };
    const dayWithoutId = {
      key: "d2",
      name: "Lower",
      weekdays: [2],
      exercises: [makeDraftExercise({ key: "ex-3" })],
    };

    const input = toWorkoutProgramInput(
      makeDraft([dayWithoutId, dayWithId], { name: "  Scheda A " }),
    );

    assert.equal(input.name, "Scheda A");
    assert.equal(input.days.length, 2);
    assert.equal(input.days[0]!.sortOrder, 0);
    assert.equal(input.days[1]!.sortOrder, 1);
    assert.equal(input.days[0]!.id, undefined);
    assert.equal(input.days[1]!.id, 11);
    assert.equal(input.days[1]!.name, "Upper");
    assert.equal(input.days[1]!.exercises[0]!.id, 5);
    assert.equal(
      input.days[1]!.exercises[0]!.catalogId,
      "Barbell_Bench_Press",
    );
    assert.equal(input.days[1]!.exercises[1]!.id, undefined);
    assert.equal(input.days[1]!.exercises[1]!.catalogId, null);
    assert.deepEqual(input.days[1]!.exercises[0]!.setPrescriptions, [
      { setNumber: 1, reps: 10, restSec: 90 },
      { setNumber: 2, reps: 8, restSec: 120 },
    ]);
  });

  it("derives frequency from distinct weekdays, clamped to 2..5", () => {
    const day = (weekdays: number[]) => ({
      key: `d-${weekdays.join("")}-${Math.random()}`,
      name: "G",
      weekdays,
      exercises: [],
    });

    assert.equal(
      toWorkoutProgramInput(makeDraft([day([0])])).frequency,
      "2× a settimana",
    );
    assert.equal(
      toWorkoutProgramInput(makeDraft([day([0]), day([2]), day([4])]))
        .frequency,
      "3× a settimana",
    );
    assert.equal(
      toWorkoutProgramInput(
        makeDraft([day([0, 1]), day([2, 3]), day([4, 5])]),
      ).frequency,
      "5× a settimana",
    );
    assert.equal(
      toWorkoutProgramInput(
        makeDraft([day([]), day([]), day([]), day([])]),
      ).frequency,
      "4× a settimana",
    );
  });
});

describe("workoutDraftFromServer", () => {
  it("sorts days by sortOrder, keeps ids, sorts prescriptions by setNumber", () => {
    const days = [
      makeDay({ id: 12, name: "Secondo", sortOrder: 1, weekdays: [3] }),
      makeDay({ id: 11, name: "Primo", sortOrder: 0, weekdays: [0] }),
    ];
    const exercisesByDayId = new Map<number, Exercise[]>([
      [
        11,
        [
          makeExercise({
            id: 5,
            name: "Panca",
            nameIt: "Panca piana",
            catalogId: "Barbell_Bench_Press",
            imageUrl: "https://x/0.jpg",
            imageUrlEnd: "https://x/1.jpg",
            setPrescriptions: [
              { setNumber: 2, reps: 8, restSec: 120 },
              { setNumber: 1, reps: 10, restSec: null },
            ],
          }),
        ],
      ],
    ]);

    const draft = workoutDraftFromServer(
      makeDetail(),
      days,
      exercisesByDayId,
    );

    assert.deepEqual(
      draft.days.map((day) => day.name),
      ["Primo", "Secondo"],
    );
    assert.equal(draft.days[0]!.id, 11);
    assert.equal(draft.days[1]!.id, 12);
    const exercise = draft.days[0]!.exercises[0]!;
    assert.equal(exercise.id, 5);
    assert.equal(exercise.catalogId, "Barbell_Bench_Press");
    assert.equal(exercise.nameIt, "Panca piana");
    assert.equal(exercise.imageUrl, "https://x/0.jpg");
    assert.deepEqual(
      exercise.prescriptions.map((set) => [set.reps, set.restSec]),
      [
        ["10", 90],
        ["8", 120],
      ],
    );
  });

  it("falls back to defaults for unknown workoutType and restSec", () => {
    const draft = workoutDraftFromServer(
      makeDetail({ workoutType: "Powerbuilding", defaultRestSec: 45 }),
      [makeDay()],
      new Map(),
    );

    assert.equal(draft.workoutType, "Forza + Ipertrofia");
    assert.equal(draft.defaultRestSec, 90);
  });
});

describe("workoutDraftExerciseFromCatalog", () => {
  const item: CatalogExercise = {
    id: "Barbell_Squat",
    name: "Barbell Squat",
    nameIt: null,
    force: null,
    level: null,
    mechanic: null,
    equipment: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    category: null,
    aliases: [],
    imageUrl: "https://img/Barbell_Squat/0.jpg",
    imageUrlEnd: null,
  };

  it("falls back to English name and derives imageUrlEnd", () => {
    const exercise = workoutDraftExerciseFromCatalog(item, 120);

    assert.equal(exercise.catalogId, "Barbell_Squat");
    assert.equal(exercise.name, "Barbell Squat");
    assert.equal(exercise.nameIt, null);
    assert.equal(exercise.nameEn, "Barbell Squat");
    assert.equal(exercise.imageUrl, "https://img/Barbell_Squat/0.jpg");
    assert.equal(exercise.imageUrlEnd, "https://img/Barbell_Squat/1.jpg");
    assert.equal(exercise.prescriptions.length, 3);
    assert.ok(
      exercise.prescriptions.every(
        (set) => set.reps === "10" && set.restSec === 120,
      ),
    );
  });

  it("prefers the Italian name when present", () => {
    const exercise = workoutDraftExerciseFromCatalog(
      { ...item, nameIt: "Squat con bilanciere" },
      90,
    );
    assert.equal(exercise.name, "Squat con bilanciere");
    assert.equal(exercise.nameIt, "Squat con bilanciere");
  });
});

describe("workoutDraftFromSchedaTxt", () => {
  it("maps parsed days without ids and derives media from catalogId", () => {
    const parsed: ParsedScheda = {
      name: "AI scheda",
      settings: {
        defaultRestSec: 120,
        workoutType: "Forza",
        frequency: "3× a settimana",
      },
      days: [
        {
          clientId: "c1",
          name: "Upper",
          sortOrder: 0,
          weekdays: [1],
          exercises: [
            {
              clientId: "e1",
              name: "Panca piana",
              catalogId: "Barbell_Bench_Press",
              setPrescriptions: [{ setNumber: 1, reps: 10, restSec: 90 }],
            },
            {
              clientId: "e2",
              name: "Custom",
              catalogId: null,
              setPrescriptions: [{ setNumber: 1, reps: 12, restSec: 60 }],
            },
          ],
        },
      ],
    };

    const draft = workoutDraftFromSchedaTxt(parsed);

    assert.equal(draft.name, "AI scheda");
    assert.equal(draft.defaultRestSec, 120);
    assert.equal(draft.workoutType, "Forza");
    assert.equal(draft.days.length, 1);
    assert.equal(draft.days[0]!.id, undefined);
    const [catalog, custom] = draft.days[0]!.exercises;
    assert.equal(catalog!.id, undefined);
    assert.equal(catalog!.catalogId, "Barbell_Bench_Press");
    assert.equal(
      catalog!.imageUrl,
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg",
    );
    assert.equal(catalog!.imageUrlEnd!.endsWith("/1.jpg"), true);
    assert.equal(custom!.catalogId, null);
    assert.equal(custom!.imageUrl, null);
    assert.equal(custom!.imageUrlEnd, null);
  });
});

describe("newWorkoutDraftDay", () => {
  it("picks the first weekday not used by existing days", () => {
    const day = newWorkoutDraftDay([
      { key: "d1", name: "G1", weekdays: [0], exercises: [] },
      { key: "d2", name: "G2", weekdays: [2], exercises: [] },
    ]);
    assert.equal(day.name, "Giorno 3");
    assert.deepEqual(day.weekdays, [1]);
  });

  it("leaves weekdays empty when all 7 are taken", () => {
    const day = newWorkoutDraftDay([
      { key: "d1", name: "G1", weekdays: [0, 1, 2, 3, 4, 5, 6], exercises: [] },
    ]);
    assert.deepEqual(day.weekdays, []);
  });
});

describe("validateWorkoutDraft", () => {
  it("rejects empty workout name", () => {
    assert.equal(
      validateWorkoutDraft(makeDraft([newWorkoutDraftDay([])], { name: "  " })),
      "Dai un nome alla scheda",
    );
  });

  it("rejects zero days and empty day names", () => {
    assert.equal(
      validateWorkoutDraft(makeDraft([])),
      "Aggiungi almeno un giorno",
    );
    assert.equal(
      validateWorkoutDraft(
        makeDraft([{ ...newWorkoutDraftDay([]), name: " " }]),
      ),
      "Ogni giorno deve avere un nome",
    );
  });

  it("rejects a weekday assigned to more than one day", () => {
    const draft = makeDraft([
      {
        key: "d1",
        name: "A",
        weekdays: [0, 2],
        exercises: [makeDraftExercise()],
      },
      {
        key: "d2",
        name: "B",
        weekdays: [2],
        exercises: [makeDraftExercise({ key: "ex-2" })],
      },
    ]);
    assert.equal(validateWorkoutDraft(draft), "Mer è assegnato a più giorni");
  });

  it("rejects a draft where every day has no exercises", () => {
    const draft = makeDraft([
      newWorkoutDraftDay([]),
      { key: "d2", name: "G2", weekdays: [1], exercises: [] },
    ]);
    assert.equal(validateWorkoutDraft(draft), "Aggiungi almeno un esercizio");
  });

  it("prefixes prescription errors with the exercise heading", () => {
    const draft = makeDraft([
      {
        ...newWorkoutDraftDay([]),
        exercises: [
          makeDraftExercise({
            nameIt: "Panca piana",
            prescriptions: [{ key: "s1", reps: "0", restSec: 90 }],
          }),
        ],
      },
    ]);

    const message = validateWorkoutDraft(draft);
    assert.ok(message?.startsWith("Panca piana: "));
    assert.match(message ?? "", /ripetizioni/i);
  });

  it("accepts a draft with an empty day when another day has exercises", () => {
    assert.equal(
      validateWorkoutDraft(
        makeDraft([
          newWorkoutDraftDay([]),
          {
            key: "d2",
            name: "G2",
            weekdays: [1],
            exercises: [makeDraftExercise()],
          },
        ]),
      ),
      null,
    );
  });
});

describe("emptyWorkoutDraft", () => {
  it("starts with one day on Monday", () => {
    const draft = emptyWorkoutDraft();
    assert.equal(draft.name, "");
    assert.equal(draft.defaultRestSec, 90);
    assert.equal(draft.workoutType, "Forza + Ipertrofia");
    assert.equal(draft.days.length, 1);
    assert.deepEqual(draft.days[0]!.weekdays, [0]);
    assert.equal(draft.days[0]!.name, "Giorno 1");
  });
});

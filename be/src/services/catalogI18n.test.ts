import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCatalogI18n,
  catalogDisplayName,
  deriveImageUrlEnd,
  translateExerciseName,
} from "./catalogI18n";

describe("deriveImageUrlEnd", () => {
  it("replaces trailing /0.jpg with /1.jpg", () => {
    assert.equal(
      deriveImageUrlEnd(
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg",
      ),
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/1.jpg",
    );
  });

  it("returns null when the url is not a 0.jpg frame", () => {
    assert.equal(deriveImageUrlEnd("https://example.com/photo.png"), null);
    assert.equal(deriveImageUrlEnd(null), null);
  });
});

describe("translateExerciseName", () => {
  it("turns bench press into an Italian panca name", () => {
    const nameIt = translateExerciseName("Barbell Bench Press");
    assert.match(nameIt.toLowerCase(), /panca/);
  });

  it("keeps already-Italian replacements from being re-translated", () => {
    assert.match(translateExerciseName("Standing Military Press").toLowerCase(), /military press/);
  });
});

describe("applyCatalogI18n", () => {
  it("lets overlay nameIt and aliases win", () => {
    const result = applyCatalogI18n(
      {
        id: "Bench_Press",
        name: "Barbell Bench Press",
        imageUrl: "https://example.com/exercises/Bench_Press/0.jpg",
      },
      {
        Bench_Press: {
          nameIt: "Panca piana",
          aliases: ["panca"],
        },
      },
    );

    assert.equal(result.nameIt, "Panca piana");
    assert.ok(result.aliases.includes("panca"));
    assert.equal(result.imageUrlEnd, "https://example.com/exercises/Bench_Press/1.jpg");
  });

  it("falls back to the glossary when no overlay exists", () => {
    const result = applyCatalogI18n(
      { id: "Cable_Fly", name: "Cable Fly", imageUrl: null },
      {},
    );

    assert.match((result.nameIt ?? "").toLowerCase(), /croci/);
    assert.equal(result.imageUrlEnd, null);
  });
});

describe("catalogDisplayName", () => {
  it("prefers Italian when present", () => {
    assert.equal(
      catalogDisplayName({ name: "Barbell Bench Press", nameIt: "Panca piana" }),
      "Panca piana",
    );
    assert.equal(catalogDisplayName({ name: "Custom move", nameIt: null }), "Custom move");
  });
});

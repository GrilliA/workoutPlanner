import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatalogFacets,
  parseCatalogSearchInput,
  searchCatalogExercises,
  type CatalogExercise,
} from "./catalogSearch";

const sample: CatalogExercise[] = [
  {
    id: "Bench_Press",
    name: "Barbell Bench Press",
    force: "push",
    level: "intermediate",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "shoulders"],
    category: "strength",
    imageUrl: null,
  },
  {
    id: "Squat",
    name: "Barbell Squat",
    force: "push",
    level: "beginner",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: ["quadriceps"],
    secondaryMuscles: ["glutes"],
    category: "strength",
    imageUrl: null,
  },
  {
    id: "Cable_Fly",
    name: "Cable Fly",
    force: "push",
    level: "beginner",
    mechanic: "isolation",
    equipment: "cable",
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    category: "strength",
    imageUrl: null,
  },
];

describe("parseCatalogSearchInput", () => {
  it("normalizes query and clamps limit", () => {
    const parsed = parseCatalogSearchInput({
      q: "  Bench  ",
      muscle: "Chest",
      limit: 999,
      offset: -1,
    });

    assert.equal(parsed.q, "bench");
    assert.equal(parsed.muscle, "chest");
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.offset, 0);
  });
});

describe("searchCatalogExercises", () => {
  it("filters by name substring and muscle", () => {
    const result = searchCatalogExercises(sample, { q: "barbell", muscle: "chest" });

    assert.equal(result.total, 1);
    assert.equal(result.items[0]?.id, "Bench_Press");
  });

  it("paginates filtered results", () => {
    const result = searchCatalogExercises(sample, {
      muscle: "chest",
      limit: 1,
      offset: 1,
    });

    assert.equal(result.total, 2);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.id, "Cable_Fly");
  });
});

describe("buildCatalogFacets", () => {
  it("returns sorted unique facet values", () => {
    const facets = buildCatalogFacets(sample);

    assert.deepEqual(facets.muscles, ["chest", "quadriceps"]);
    assert.deepEqual(facets.equipment, ["barbell", "cable"]);
    assert.deepEqual(facets.levels, ["beginner", "intermediate"]);
  });
});

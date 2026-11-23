import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ListedMealTag } from "@api";
import { archivedTagLabel, skippedTagsOf, tagNameOf, tagOptionsFor } from "./tagLabels.ts";

const tag = (id: number, name: string): ListedMealTag => ({
  id,
  name,
  position: id,
  archivedAt: null,
  planCount: 0,
  templateCount: 0,
});

describe("tagNameOf", () => {
  const knownTags = [tag(1, "Colazione"), tag(4, "Merenda")];

  it("uses the name of a known tag", () => {
    assert.equal(tagNameOf(4, knownTags, [{ tagId: 4, name: "Vecchio nome" }]), "Merenda");
  });

  it("falls back to the name saved with the meal, then to Pasto", () => {
    assert.equal(tagNameOf(9, knownTags, [{ tagId: 9, name: "Pre nanna" }]), "Pre nanna");
    assert.equal(tagNameOf(9, knownTags, []), "Pasto");
  });
});

describe("tagOptionsFor", () => {
  const liveTags = [tag(1, "Colazione"), tag(3, "Pranzo")];

  it("offers the live tags only for a live tag", () => {
    assert.deepEqual(tagOptionsFor(liveTags, 3, "Pranzo"), [
      { value: "1", label: "Colazione" },
      { value: "3", label: "Pranzo" },
    ]);
  });

  it("adds the archived tag of the meal, marked as archived", () => {
    assert.deepEqual(tagOptionsFor(liveTags, 4, "Merenda"), [
      { value: "1", label: "Colazione" },
      { value: "3", label: "Pranzo" },
      { value: "4", label: archivedTagLabel("Merenda") },
    ]);
    assert.equal(archivedTagLabel("Merenda"), "Merenda · archiviato");
  });
});

describe("skippedTagsOf", () => {
  const meals = [
    { tagId: 1, name: "Colazione" },
    { tagId: 4, name: "Merenda" },
    { tagId: 3, name: "Pranzo" },
    { tagId: 4, name: "Merenda" },
  ];

  it("counts every skipped meal and names each archived tag once", () => {
    assert.deepEqual(skippedTagsOf(meals, [1, 3]), {
      skippedCount: 2,
      skippedTagNames: ["Merenda"],
    });
  });

  it("skips nothing when every tag is live", () => {
    assert.deepEqual(skippedTagsOf(meals, [1, 3, 4]), { skippedCount: 0, skippedTagNames: [] });
  });
});

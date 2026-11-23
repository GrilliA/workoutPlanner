import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveItemTo } from "./moveItemTo.ts";

describe("moveItemTo", () => {
  const items = ["a", "b", "c", "d"];

  it("moves an item later and earlier", () => {
    assert.deepEqual(moveItemTo(items, 0, 2), ["b", "c", "a", "d"]);
    assert.deepEqual(moveItemTo(items, 3, 1), ["a", "d", "b", "c"]);
  });

  it("leaves the list as it is when the move is out of range or in place", () => {
    assert.equal(moveItemTo(items, 1, 1), items);
    assert.equal(moveItemTo(items, -1, 2), items);
    assert.equal(moveItemTo(items, 1, 4), items);
  });

  it("never changes the list it receives", () => {
    moveItemTo(items, 0, 3);
    assert.deepEqual(items, ["a", "b", "c", "d"]);
  });
});

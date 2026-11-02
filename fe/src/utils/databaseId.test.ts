import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDatabaseId } from "./databaseId.ts";

describe("isDatabaseId", () => {
  it("accepts the integers Postgres can store as a positive id", () => {
    assert.equal(isDatabaseId(1), true);
    assert.equal(isDatabaseId(2_147_483_647), true);
  });

  it("refuses everything else a route segment can turn into", () => {
    assert.equal(isDatabaseId(0), false);
    assert.equal(isDatabaseId(-1), false);
    assert.equal(isDatabaseId(1.5), false);
    assert.equal(isDatabaseId(Number.NaN), false);
    assert.equal(isDatabaseId(2_147_483_648), false);
  });
});

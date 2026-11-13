import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rangeFilterState } from "./rangeRequest.ts";

describe("rangeFilterState", () => {
  it("first read: the requested range, no refreshing (the skeleton shows)", () => {
    assert.deepEqual(rangeFilterState({ requested: { range: "6m", id: 0 }, loaded: undefined, failedRequestId: null }), {
      selectedRange: "6m",
      isRefreshing: false,
    });
  });

  it("6m on screen, 12m on its way: 12m selected and refreshing", () => {
    assert.deepEqual(
      rangeFilterState({ requested: { range: "12m", id: 1 }, loaded: { range: "6m", id: 0 }, failedRequestId: null }),
      { selectedRange: "12m", isRefreshing: true },
    );
  });

  it("12m failed: back to 6m, the range of the numbers on screen", () => {
    assert.deepEqual(
      rangeFilterState({ requested: { range: "12m", id: 1 }, loaded: { range: "6m", id: 0 }, failedRequestId: 1 }),
      { selectedRange: "6m", isRefreshing: false },
    );
  });

  it("a new try after the failure is refreshing again", () => {
    assert.deepEqual(
      rangeFilterState({ requested: { range: "12m", id: 2 }, loaded: { range: "6m", id: 0 }, failedRequestId: 1 }),
      { selectedRange: "12m", isRefreshing: true },
    );
  });

  it("12m answered: 12m selected, not refreshing", () => {
    assert.deepEqual(
      rangeFilterState({ requested: { range: "12m", id: 1 }, loaded: { range: "12m", id: 1 }, failedRequestId: null }),
      { selectedRange: "12m", isRefreshing: false },
    );
  });
});

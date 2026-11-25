import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeLabelFits, activePillContentWidth, isHiddenTabStyle } from "./tabBarLayout";

describe("isHiddenTabStyle", () => {
  it("hides the tabs expo-router marks with href: null", () => {
    assert.equal(isHiddenTabStyle({ display: "none" }), true);
  });

  it("shows tabs without a style or with another display", () => {
    assert.equal(isHiddenTabStyle(undefined), false);
    assert.equal(isHiddenTabStyle(null), false);
    assert.equal(isHiddenTabStyle({ opacity: 1 }), false);
    assert.equal(isHiddenTabStyle({ display: "flex" }), false);
  });

  it("reads the last display of a style array, like StyleSheet.flatten", () => {
    assert.equal(isHiddenTabStyle([{ display: "flex" }, [{ display: "none" }]]), true);
    assert.equal(isHiddenTabStyle([{ display: "none" }, { display: "flex" }]), false);
    assert.equal(isHiddenTabStyle([{ display: "none" }, { opacity: 0.5 }]), true);
  });
});

describe("activePillContentWidth", () => {
  it("matches the open pill measured on a 390 wide phone (358 bar, 4 tabs)", () => {
    // Pill misurata 145 px sul build web = 113 px di contenuto + 2 × 16 di padding.
    assert.equal(Math.round(activePillContentWidth(358, 4)), 113);
  });

  it("is narrower on a 360 phone with text at 150% (240 px wide, 208 bar)", () => {
    assert.equal(Math.round(activePillContentWidth(208, 4)), 57);
  });

  it("never goes below zero", () => {
    assert.equal(activePillContentWidth(20, 4), 0);
  });
});

describe("activeLabelFits", () => {
  it("keeps the label when icon, gap and label fit", () => {
    assert.equal(activeLabelFits(113, 80), true);
    assert.equal(activeLabelFits(109, 80), true);
  });

  it("drops the label (icon only) when it would be cut", () => {
    assert.equal(activeLabelFits(57, 33), false);
    assert.equal(activeLabelFits(108, 80), false);
  });
});

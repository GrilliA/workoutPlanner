import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appModeForFocusedTab,
  isTabHiddenInMode,
  parseStoredAppMode,
  resolveAppMode,
} from "./appMode";

describe("parseStoredAppMode", () => {
  it("reads the two saved modes", () => {
    assert.equal(parseStoredAppMode("nutrition"), "nutrition");
    assert.equal(parseStoredAppMode("training"), "training");
  });

  it("starts in training with nothing saved or an unknown value", () => {
    assert.equal(parseStoredAppMode(null), "training");
    assert.equal(parseStoredAppMode(""), "training");
    assert.equal(parseStoredAppMode("dieta"), "training");
  });
});

describe("resolveAppMode", () => {
  it("keeps the chosen mode while the meal plan is active", () => {
    assert.equal(resolveAppMode("nutrition", true), "nutrition");
    assert.equal(resolveAppMode("training", true), "training");
  });

  it("shows training without an active meal plan, whatever was chosen", () => {
    assert.equal(resolveAppMode("nutrition", false), "training");
    assert.equal(resolveAppMode("training", false), "training");
  });
});

describe("isTabHiddenInMode", () => {
  const tabRoutes = ["index", "workouts", "meals", "stats", "settings"];
  const visibleTabs = (mode: "training" | "nutrition") =>
    tabRoutes.filter((routeName) => !isTabHiddenInMode(routeName, mode));

  it("shows Home, Schede, Progressi, Account in training", () => {
    assert.deepEqual(visibleTabs("training"), ["index", "workouts", "stats", "settings"]);
  });

  it("shows Oggi, Piano pasti, Progressi, Account in nutrition", () => {
    assert.deepEqual(visibleTabs("nutrition"), ["index", "meals", "stats", "settings"]);
  });

  it("never hides a route it does not know", () => {
    assert.equal(isTabHiddenInMode("coach", "nutrition"), false);
  });
});

describe("appModeForFocusedTab", () => {
  it("moves to training when a link opens Schede in nutrition", () => {
    assert.equal(appModeForFocusedTab("workouts", "nutrition", true), "training");
  });

  it("moves to nutrition when a link opens Piano pasti with an active plan", () => {
    assert.equal(appModeForFocusedTab("meals", "training", true), "nutrition");
  });

  it("stays in training when Piano pasti opens without an active plan", () => {
    assert.equal(appModeForFocusedTab("meals", "training", false), "training");
  });

  it("keeps the mode on the tabs both modes share", () => {
    assert.equal(appModeForFocusedTab("index", "nutrition", true), "nutrition");
    assert.equal(appModeForFocusedTab("stats", "training", true), "training");
    assert.equal(appModeForFocusedTab("settings", "nutrition", true), "nutrition");
  });
});

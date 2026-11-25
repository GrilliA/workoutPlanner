import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appModeToSaveOnTabChange,
  displayedAppMode,
  focusedTabFromSegments,
  isTabHiddenInMode,
  parseStoredAppMode,
  type AppMode,
} from "./appMode";

describe("parseStoredAppMode", () => {
  it("reads the two saved modes", () => {
    assert.equal(parseStoredAppMode("nutrition"), "nutrition");
    assert.equal(parseStoredAppMode("training"), "training");
  });

  it("starts in training with nothing saved or an unknown value", () => {
    assert.equal(parseStoredAppMode(null), "training");
    assert.equal(parseStoredAppMode(""), "training");
    assert.equal(parseStoredAppMode("unknown"), "training");
  });
});

const KNOWN_WITH_PLAN = { isNutritionAvailable: true, isNutritionKnown: true };
const KNOWN_WITHOUT_PLAN = { isNutritionAvailable: false, isNutritionKnown: true };
const NOT_KNOWN_YET = { isNutritionAvailable: false, isNutritionKnown: false };

describe("displayedAppMode", () => {
  it("shows the chosen mode on the tabs both modes share", () => {
    assert.equal(displayedAppMode({ chosenMode: "nutrition", focusedTab: "index", ...KNOWN_WITH_PLAN }), "nutrition");
    assert.equal(displayedAppMode({ chosenMode: "training", focusedTab: "stats", ...KNOWN_WITH_PLAN }), "training");
  });

  it("shows training on Schede even when nutrition was chosen (direct link)", () => {
    assert.equal(displayedAppMode({ chosenMode: "nutrition", focusedTab: "workouts", ...KNOWN_WITH_PLAN }), "training");
  });

  it("shows nutrition on Piano pasti with an active plan", () => {
    assert.equal(displayedAppMode({ chosenMode: "training", focusedTab: "meals", ...KNOWN_WITH_PLAN }), "nutrition");
  });

  it("shows training on Piano pasti once nutrition is known to be null", () => {
    assert.equal(displayedAppMode({ chosenMode: "nutrition", focusedTab: "meals", ...KNOWN_WITHOUT_PLAN }), "training");
  });

  it("starts in training on the shared tabs until the Home answers", () => {
    assert.equal(displayedAppMode({ chosenMode: "nutrition", focusedTab: "index", ...NOT_KNOWN_YET }), "training");
  });

  it("keeps Piano pasti in nutrition until the Home answers (no redirect yet)", () => {
    assert.equal(displayedAppMode({ chosenMode: "training", focusedTab: "meals", ...NOT_KNOWN_YET }), "nutrition");
  });

  it("goes back to training when the coach turns the plan off", () => {
    assert.equal(displayedAppMode({ chosenMode: "nutrition", focusedTab: "stats", ...KNOWN_WITHOUT_PLAN }), "training");
  });
});

describe("appModeToSaveOnTabChange", () => {
  const save = (chosenMode: AppMode, focusedTab: string, nutrition: typeof KNOWN_WITH_PLAN) =>
    appModeToSaveOnTabChange({ chosenMode, focusedTab, ...nutrition });

  it("saves training when a link opens Schede in nutrition", () => {
    assert.equal(save("nutrition", "workouts", KNOWN_WITH_PLAN), "training");
  });

  it("saves nutrition when a link opens Piano pasti with an active plan", () => {
    assert.equal(save("training", "meals", KNOWN_WITH_PLAN), "nutrition");
  });

  it("never saves before nutrition is known (tap on Schede in the first second)", () => {
    assert.equal(save("nutrition", "workouts", NOT_KNOWN_YET), null);
    assert.equal(save("training", "meals", NOT_KNOWN_YET), null);
  });

  it("does not save nutrition without an active plan", () => {
    assert.equal(save("training", "meals", KNOWN_WITHOUT_PLAN), null);
  });

  it("saves nothing on shared tabs or when the mode is already the chosen one", () => {
    assert.equal(save("nutrition", "index", KNOWN_WITH_PLAN), null);
    assert.equal(save("training", "settings", KNOWN_WITH_PLAN), null);
    assert.equal(save("training", "workouts", KNOWN_WITH_PLAN), null);
  });
});

describe("isTabHiddenInMode", () => {
  const tabRoutes = ["index", "workouts", "meals", "stats", "settings"];
  const visibleTabs = (mode: AppMode) =>
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

describe("focusedTabFromSegments", () => {
  it("reads the tab inside the (app) group, index when there is none", () => {
    assert.equal(focusedTabFromSegments(["(app)", "workouts"], "index"), "workouts");
    assert.equal(focusedTabFromSegments(["(app)", "settings", "coach"], "index"), "settings");
    assert.equal(focusedTabFromSegments(["(app)"], "stats"), "index");
  });

  it("keeps the last tab under a stack screen", () => {
    assert.equal(focusedTabFromSegments(["session", "[sessionId]"], "workouts"), "workouts");
  });
});

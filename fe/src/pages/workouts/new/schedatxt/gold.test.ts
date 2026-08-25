import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseSchedaTxt,
  SCHEDA_TXT_AI_PROMPT,
  SCHEDA_TXT_EXAMPLE,
  type ParsedScheda,
} from "./parseSchedaTxt.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLD_DIR = join(HERE, "gold");
const MOBILE_PARSER = join(
  HERE,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "mobile",
  "src",
  "schedatxt",
  "parseSchedaTxt.ts",
);

const GOLD_CASES = [
  "ppl-3x",
  "fullbody-default-rest",
  "forza-labeled",
] as const;

type GoldSet = {
  reps: number;
  restSec: number;
};

type GoldExpected = {
  name: string;
  frequency: string;
  workoutType: string;
  defaultRestSec: number;
  days: Array<{
    name: string;
    weekdays: number[];
    exercises: Array<{
      name: string;
      sets: GoldSet[];
    }>;
  }>;
};

const loadGoldText = (id: string): string =>
  readFileSync(join(GOLD_DIR, `${id}.txt`), "utf8");

const loadGoldExpected = (id: string): GoldExpected =>
  JSON.parse(readFileSync(join(GOLD_DIR, `${id}.json`), "utf8")) as GoldExpected;

const snapshotDays = (days: ParsedScheda["days"]): GoldExpected["days"] =>
  days.map((day) => ({
    name: day.name,
    weekdays: day.weekdays,
    exercises: day.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.setPrescriptions.map((set) => ({
        reps: set.reps,
        restSec: set.restSec,
      })),
    })),
  }));

describe("scheda TXT gold set", () => {
  for (const id of GOLD_CASES) {
    it(`parses ${id} into days, reps, and rest`, () => {
      const expected = loadGoldExpected(id);
      const result = parseSchedaTxt(loadGoldText(id));
      assert.equal(result.ok, true, result.ok ? "" : result.error);
      if (!result.ok) {
        return;
      }

      assert.equal(result.value.name, expected.name);
      assert.equal(result.value.settings.frequency, expected.frequency);
      assert.equal(result.value.settings.workoutType, expected.workoutType);
      assert.equal(result.value.settings.defaultRestSec, expected.defaultRestSec);
      assert.deepEqual(snapshotDays(result.value.days), expected.days);
    });
  }

  it("uses numbered day headers instead of weekdays", () => {
    for (const id of GOLD_CASES) {
      const txt = loadGoldText(id);
      assert.match(txt, /giorno\s+\d+/i);
      assert.doesNotMatch(
        txt,
        /^(?:##\s*)?(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|monday)/im,
      );
    }
  });
});

describe("SCHEDA_TXT_AI_PROMPT contract", () => {
  it("still teaches the three formats the gold fixtures use", () => {
    assert.match(SCHEDA_TXT_AI_PROMPT, /^# <Nome scheda>/m);
    assert.match(SCHEDA_TXT_AI_PROMPT, /Frequenza:/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /Recupero default: <60\|90\|120\|150>/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /## Giorno 1:/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /### <Nome esercizio>/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /<reps>@<recupero_sec>/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /reps: 12-10-8-6/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /recupero: 90/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /12 10 8 6/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /NON giorni della settimana/);
  });

  it("keeps the builder example aligned with the parser", () => {
    const result = parseSchedaTxt(SCHEDA_TXT_EXAMPLE);
    assert.equal(result.ok, true);
  });

  it("keeps the mobile copy of the prompt in sync", () => {
    const mobileSrc = readFileSync(MOBILE_PARSER, "utf8");
    assert.ok(
      mobileSrc.includes(SCHEDA_TXT_AI_PROMPT),
      "mobile/src/schedatxt/parseSchedaTxt.ts SCHEDA_TXT_AI_PROMPT diverged from fe/",
    );
  });
});

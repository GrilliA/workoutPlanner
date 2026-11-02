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
const MOBILE_PARSER = join(HERE, "..", "..", "..", "..", "..", "..", "mobile", "src", "schedatxt");

const promptTemplate = (source: string): string => {
  const match = source.match(/export const SCHEDA_TXT_AI_PROMPT = `([\s\S]*?)`;/);
  if (!match?.[1]) {
    throw new Error("SCHEDA_TXT_AI_PROMPT template missing");
  }
  return match[1];
};

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
    assert.match(SCHEDA_TXT_AI_PROMPT, /<reps_min>-<reps_max>@<recupero_sec>/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /Carico: /);
    assert.match(SCHEDA_TXT_AI_PROMPT, /RIR: /);
    assert.match(SCHEDA_TXT_AI_PROMPT, /Note: /);
  });

  it("keeps the builder example aligned with the parser", () => {
    const result = parseSchedaTxt(SCHEDA_TXT_EXAMPLE);
    assert.equal(result.ok, true);
  });

  it("keeps the mobile copy of the prompt in sync", () => {
    const feSrc = readFileSync(join(HERE, "parseSchedaTxt.ts"), "utf8");
    const mobileSrc = readFileSync(join(MOBILE_PARSER, "parseSchedaTxt.ts"), "utf8");
    assert.equal(
      promptTemplate(mobileSrc),
      promptTemplate(feSrc),
      "mobile/src/schedatxt/parseSchedaTxt.ts SCHEDA_TXT_AI_PROMPT diverged from fe/",
    );
    assert.equal(
      readFileSync(join(MOBILE_PARSER, "catalogPromptExercises.json"), "utf8"),
      readFileSync(join(HERE, "catalogPromptExercises.json"), "utf8"),
    );
  });

  it("lists catalog names and links an exact title to its photo", () => {
    assert.match(SCHEDA_TXT_AI_PROMPT, /Nomi esercizio ammessi:\n/);
    assert.match(SCHEDA_TXT_AI_PROMPT, /^Panca piana$/m);
    assert.match(SCHEDA_TXT_AI_PROMPT, /^Squat — Barbell Squat$/m);

    const result = parseSchedaTxt(`# Test
Frequenza: 3× a settimana
Tipo: Ipertrofia
Recupero default: 90

## Giorno 1: Upper
### Panca piana
8@90

### Squat — Barbell Squat
5@150

### Esercizio inventato
10@90
`);

    assert.equal(result.ok, true, result.ok ? "" : result.error);
    if (!result.ok) {
      return;
    }

    const [bench, squat, custom] = result.value.days[0]!.exercises;
    assert.equal(bench!.name, "Panca piana");
    assert.equal(bench!.catalogId, "Barbell_Bench_Press_-_Medium_Grip");
    assert.equal(bench!.nameIt, "Panca piana");
    assert.equal(
      bench!.imageUrl,
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg",
    );
    assert.equal(bench!.imageUrlEnd?.endsWith("/1.jpg"), true);
    assert.equal(squat!.catalogId, "Barbell_Squat");
    assert.equal(squat!.nameIt, "Squat");
    assert.equal(custom!.catalogId, null);
    assert.equal(custom!.imageUrl, null);
  });
});

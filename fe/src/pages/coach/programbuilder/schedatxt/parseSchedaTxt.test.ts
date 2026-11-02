import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseSchedaTxt,
  SCHEDA_TXT_EXAMPLE,
} from "./parseSchedaTxt.ts";

describe("parseSchedaTxt", () => {
  it("parses the canonical example", () => {
    const result = parseSchedaTxt(SCHEDA_TXT_EXAMPLE);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.value.name, "Full Body principiante");
    assert.equal(result.value.settings.frequency, "3× a settimana");
    assert.equal(result.value.days.length, 2);
    assert.equal(result.value.days[0]?.name, "Upper");
    assert.equal(result.value.days[0]?.exercises[0]?.name, "Panca piana");
    assert.deepEqual(
      result.value.days[0]?.exercises[0]?.setPrescriptions.map((set) => set.reps),
      [12, 10, 8, 6],
    );
    assert.equal(result.value.days[1]?.exercises[1]?.name, "Affondi");
    assert.equal(
      result.value.days[1]?.exercises[1]?.setPrescriptions[0]?.restSec,
      90,
    );
  });

  it("uses default rest when @rest is omitted", () => {
    const result = parseSchedaTxt(`# Test
Recupero default: 120

## Giorno 1: A
### Curl
12 10 8
`);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.value.settings.defaultRestSec, 120);
    assert.ok(
      result.value.days[0]?.exercises[0]?.setPrescriptions.every(
        (set) => set.restSec === 120,
      ),
    );
  });

  it("assigns sequential weekdays by day order", () => {
    const result = parseSchedaTxt(SCHEDA_TXT_EXAMPLE);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.deepEqual(result.value.days[0]?.weekdays, [0]);
    assert.deepEqual(result.value.days[1]?.weekdays, [1]);
  });

  it("rejects empty input", () => {
    const result = parseSchedaTxt("   ");
    assert.equal(result.ok, false);
  });

  it("rejects day without exercises", () => {
    const result = parseSchedaTxt(`## Giorno 1: Solo titolo
`);
    assert.equal(result.ok, false);
  });

  it("rejects an exercise with more than 30 sets", () => {
    const sets = (count: number) => Array.from({ length: count }, () => "10").join(" ");
    const scheda = (count: number) => `## Giorno 1: Upper
### Panca piana
${sets(count)}
`;

    assert.equal(parseSchedaTxt(scheda(30)).ok, true);
    assert.deepEqual(parseSchedaTxt(scheda(31)), {
      ok: false,
      error: `L'esercizio "Panca piana" ha più di 30 serie`,
    });
  });
});

describe("parseSchedaTxt prescription fields", () => {
  const parseSingleExercise = (exerciseLines: string) =>
    parseSchedaTxt(`# Test
Recupero default: 90

## Giorno 1: A
### Squat
${exerciseLines}
`);

  const firstExercise = (result: ReturnType<typeof parseSchedaTxt>) => {
    assert.equal(result.ok, true, result.ok ? "" : result.error);
    if (!result.ok) {
      throw new Error(result.error);
    }
    const exercise = result.value.days[0]?.exercises[0];
    if (!exercise) {
      throw new Error("exercise missing");
    }
    return exercise;
  };

  it("reads a rep range written as min-max@rest", () => {
    const squat = firstExercise(parseSingleExercise("8-12@90 8-12@90 6@120"));

    assert.deepEqual(
      squat.setPrescriptions.map((set) => [set.reps, set.repsMax, set.restSec]),
      [
        [8, 12, 90],
        [8, 12, 90],
        [6, null, 120],
      ],
    );
  });

  it("keeps 8-12 without @ as two sets, like before", () => {
    const squat = firstExercise(parseSingleExercise("8-12"));

    assert.deepEqual(
      squat.setPrescriptions.map((set) => [set.reps, set.repsMax]),
      [
        [8, null],
        [12, null],
      ],
    );
  });

  it("applies one load and RIR to every set", () => {
    const squat = firstExercise(
      parseSingleExercise("5@180 5@180 5@180\nCarico: 82,5 kg\nRIR: 2"),
    );

    assert.deepEqual(
      squat.setPrescriptions.map((set) => [set.loadValue, set.loadUnit, set.rir]),
      [
        [82.5, "kg", 2],
        [82.5, "kg", 2],
        [82.5, "kg", 2],
      ],
    );
  });

  it("reads one %1RM load per set and turns RPE into RIR", () => {
    const squat = firstExercise(
      parseSingleExercise("reps: 5-5-3\nrecupero: 180\nCarico: 75% 80% 85% 1RM\nRPE: 7 8 9"),
    );

    assert.deepEqual(
      squat.setPrescriptions.map((set) => [set.loadValue, set.loadUnit, set.rir]),
      [
        [75, "percent_1rm", 3],
        [80, "percent_1rm", 2],
        [85, "percent_1rm", 1],
      ],
    );
  });

  it("keeps notes for the athlete", () => {
    const squat = firstExercise(parseSingleExercise("5@180\nNote: fermo 1s in buca"));

    assert.equal(squat.notes, "fermo 1s in buca");
  });

  it("rejects a load count that does not match the sets", () => {
    const result = parseSingleExercise("5@180 5@180 5@180\nCarico: 80kg 70kg");

    assert.equal(result.ok, false);
  });

  it("rejects a load before the sets and a percentage over 100", () => {
    assert.equal(parseSingleExercise("Carico: 80kg\n5@180").ok, false);
    assert.equal(parseSingleExercise("5@180\nCarico: 120%").ok, false);
  });

  it("rejects a range whose top is lower than the bottom", () => {
    assert.equal(parseSingleExercise("12-8@90").ok, false);
  });
});

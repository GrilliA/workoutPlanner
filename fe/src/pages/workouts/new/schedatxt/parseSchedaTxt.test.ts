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
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { archivedUsage, planUsage, renameNote } from "./usage.ts";

describe("planUsage", () => {
  it("says how many active plans use the tag", () => {
    assert.equal(planUsage(0), "in nessun piano");
    assert.equal(planUsage(1), "in 1 piano");
    assert.equal(planUsage(12), "in 12 piani");
  });
});

describe("archivedUsage", () => {
  it("names plans and templates only when they are there", () => {
    assert.equal(archivedUsage(2, 1), "ancora in 2 piani e 1 template");
    assert.equal(archivedUsage(1, 0), "ancora in 1 piano");
    assert.equal(archivedUsage(0, 3), "ancora in 3 template");
    assert.equal(archivedUsage(0, 0), "non più usato");
  });
});

describe("renameNote", () => {
  it("counts the plans with the right article", () => {
    const logRule = "Il registro dei clienti tiene il nome di quando hanno segnato il pasto.";

    assert.equal(renameNote(12), `Cambia il nome in tutti i 12 piani. ${logRule}`);
    assert.equal(renameNote(8), `Cambia il nome in tutti gli 8 piani. ${logRule}`);
    assert.equal(renameNote(1), `Cambia il nome nell'unico piano che lo usa. ${logRule}`);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { archivedUsage, renameNote, tagUsage } from "./usage.ts";

describe("tagUsage", () => {
  it("says what uses the tag, plans and templates only when they are there", () => {
    assert.equal(tagUsage(0, 0), "in nessun piano");
    assert.equal(tagUsage(1, 0), "in 1 piano");
    assert.equal(tagUsage(12, 0), "in 12 piani");
    assert.equal(tagUsage(2, 1), "in 2 piani e 1 template");
    assert.equal(tagUsage(0, 3), "in 3 template");
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
  const logRule = "Il registro dei clienti tiene il nome di quando hanno segnato il pasto.";

  it("counts the plans with the right article", () => {
    assert.equal(renameNote(12, 0), `Cambia il nome in tutti i 12 piani. ${logRule}`);
    assert.equal(renameNote(8, 0), `Cambia il nome in tutti gli 8 piani. ${logRule}`);
    assert.equal(renameNote(1, 0), `Cambia il nome nell'unico piano che lo usa. ${logRule}`);
  });

  it("names the templates too when there are any", () => {
    assert.equal(renameNote(8, 2), `Cambia il nome in tutti gli 8 piani e in 2 template. ${logRule}`);
    assert.equal(renameNote(1, 1), `Cambia il nome nell'unico piano che lo usa e in 1 template. ${logRule}`);
    assert.equal(renameNote(0, 3), `Cambia il nome in 3 template. ${logRule}`);
  });

  it("says the name is valid everywhere when nothing uses the tag yet", () => {
    assert.equal(renameNote(0, 0), `Il nuovo nome vale in tutti i piani e i template. ${logRule}`);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCentsAsInput, formatEuros, parseEurosToCents } from "./money.ts";

describe("parseEurosToCents", () => {
  it("reads whole euros and up to two decimals with a comma or a point", () => {
    assert.deepEqual(parseEurosToCents("80"), { ok: true, cents: 8000 });
    assert.deepEqual(parseEurosToCents("80,5"), { ok: true, cents: 8050 });
    assert.deepEqual(parseEurosToCents("80.50"), { ok: true, cents: 8050 });
    assert.deepEqual(parseEurosToCents(" 0 "), { ok: true, cents: 0 });
    assert.deepEqual(parseEurosToCents("10000"), { ok: true, cents: 1_000_000 });
  });

  it("refuses an empty field", () => {
    assert.equal(parseEurosToCents("  ").ok, false);
  });

  it("refuses more than two decimals and thousands separators", () => {
    assert.equal(parseEurosToCents("80,555").ok, false);
    assert.equal(parseEurosToCents("1.000").ok, false);
    assert.equal(parseEurosToCents("1.000,50").ok, false);
    assert.equal(parseEurosToCents("1 000").ok, false);
  });

  it("reads zero written in any form", () => {
    assert.deepEqual(parseEurosToCents("0,00"), { ok: true, cents: 0 });
    assert.deepEqual(parseEurosToCents("0.0"), { ok: true, cents: 0 });
  });

  it("refuses the Italian thousands separators instead of misreading them", () => {
    // "10.000" would be 10 € with a point as decimal mark and 10.000 € in Italian: refused.
    const formatError = "Scrivi l'importo in euro, con al massimo 2 decimali (es. 80 o 80,50).";

    assert.deepEqual(parseEurosToCents("10.000"), { ok: false, error: formatError });
    assert.deepEqual(parseEurosToCents("10.000,00"), { ok: false, error: formatError });
    assert.deepEqual(parseEurosToCents("1.234,56"), { ok: false, error: formatError });
    assert.deepEqual(parseEurosToCents("10,000"), { ok: false, error: formatError });
  });

  it("refuses a decimal mark without digits on both sides", () => {
    assert.equal(parseEurosToCents(",5").ok, false);
    assert.equal(parseEurosToCents("5,").ok, false);
  });

  it("refuses negative and non numeric text", () => {
    assert.equal(parseEurosToCents("-5").ok, false);
    assert.equal(parseEurosToCents("80 €").ok, false);
    assert.equal(parseEurosToCents("abc").ok, false);
  });

  it("refuses amounts above 10.000 €", () => {
    assert.deepEqual(parseEurosToCents("10000,01"), {
      ok: false,
      error: "L'importo deve essere tra 0 e 10.000 €.",
    });
  });
});

describe("formatEuros", () => {
  it("drops the decimals of a whole amount", () => {
    assert.equal(formatEuros(8000), "80\u00a0€");
  });

  it("shows two decimals otherwise", () => {
    assert.equal(formatEuros(8050), "80,50\u00a0€");
    assert.equal(formatEuros(5), "0,05\u00a0€");
  });

  it("groups thousands the Italian way", () => {
    assert.equal(formatEuros(1_000_000), "10.000\u00a0€");
    assert.equal(formatEuros(100_000), "1.000\u00a0€");
    assert.equal(formatEuros(123_456), "1.234,56\u00a0€");
    assert.equal(formatEuros(999_999), "9.999,99\u00a0€");
  });

  it("shows zero as 0 €", () => {
    assert.equal(formatEuros(0), "0\u00a0€");
  });
});

describe("formatCentsAsInput", () => {
  it("gives a value parseEurosToCents reads back", () => {
    assert.equal(formatCentsAsInput(8050), "80,50");
    assert.equal(formatCentsAsInput(1_000_000), "10000");
    assert.deepEqual(parseEurosToCents(formatCentsAsInput(123_456)), { ok: true, cents: 123_456 });
  });

  it("never adds a thousands separator, which parseEurosToCents would refuse", () => {
    assert.equal(formatCentsAsInput(100_000), "1000");
    assert.equal(formatCentsAsInput(0), "0");
    assert.deepEqual(parseEurosToCents(formatCentsAsInput(999_999)), { ok: true, cents: 999_999 });
    assert.deepEqual(parseEurosToCents(formatCentsAsInput(0)), { ok: true, cents: 0 });
  });
});

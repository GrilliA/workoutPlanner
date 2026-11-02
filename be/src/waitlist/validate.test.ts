import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideWaitlistBody, normalizeWaitlistEmail } from "./validate";

const signup = {
  email: "Coach@Example.com",
  role: "coach",
  consent: true,
  ref: "MARCO7",
  company: "",
};

describe("normalizeWaitlistEmail", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeWaitlistEmail("  A@B.COM "), "a@b.com");
  });
});

describe("decideWaitlistBody", () => {
  it("accepts a signup and normalizes the email", () => {
    const decision = decideWaitlistBody(signup);
    assert.equal(decision.kind, "signup");
    if (decision.kind === "signup") {
      assert.equal(decision.value.email, "coach@example.com");
      assert.equal(decision.value.role, "coach");
      assert.equal(decision.value.ref, "MARCO7");
    }
  });

  it("accepts the form consent values and an athlete", () => {
    const decision = decideWaitlistBody({ ...signup, role: "athlete", consent: "yes", ref: "" });
    assert.equal(decision.kind, "signup");
    if (decision.kind === "signup") {
      assert.equal(decision.value.role, "athlete");
      assert.equal(decision.value.ref, null);
    }
  });

  it("treats a filled honeypot as success-without-store, even if the email is bad", () => {
    const decision = decideWaitlistBody({ ...signup, email: "nope", company: "acme" });
    assert.deepEqual(decision, { kind: "honeypot" });
  });

  it("treats a non-string honeypot as filled", () => {
    const decision = decideWaitlistBody({ ...signup, company: ["acme"] });
    assert.equal(decision.kind, "honeypot");
  });

  it("rejects a missing consent, a bad email, a bad role, and a messy ref", () => {
    assert.equal(decideWaitlistBody({ ...signup, consent: false }).kind, "invalid");
    assert.equal(decideWaitlistBody({ ...signup, email: "not-an-email" }).kind, "invalid");
    assert.equal(decideWaitlistBody({ ...signup, role: "admin" }).kind, "invalid");
    assert.equal(decideWaitlistBody({ ...signup, ref: "<script>" }).kind, "invalid");
    assert.equal(decideWaitlistBody(null).kind, "invalid");
  });
});

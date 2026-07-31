import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCreateClientInput, validateResetPasswordInput } from "./clientValidation";

describe("clientValidation", () => {
  it("accepts valid client payload", () => {
    const result = validateCreateClientInput({
      email: "Cliente@Example.com",
      password: "password1",
      name: "Marco",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.email, "cliente@example.com");
      assert.equal(result.value.name, "Marco");
    }
  });

  it("omits blank name", () => {
    const result = validateCreateClientInput({
      email: "a@b.com",
      password: "password1",
      name: "   ",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.name, undefined);
    }
  });

  it("rejects short password", () => {
    const result = validateCreateClientInput({
      email: "a@b.com",
      password: "short",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /8 characters/);
    }
  });

  it("rejects invalid email", () => {
    const result = validateCreateClientInput({
      email: "not-an-email",
      password: "password1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /email/i);
    }
  });

  it("rejects invalid request body", () => {
    assert.equal(validateCreateClientInput(null).ok, false);
    assert.equal(validateCreateClientInput(undefined).ok, false);
    assert.equal(validateCreateClientInput("payload").ok, false);
  });

  it("validates reset password input", () => {
    const ok = validateResetPasswordInput({ password: "newpassword1" });
    assert.equal(ok.ok, true);

    const short = validateResetPasswordInput({ password: "short" });
    assert.equal(short.ok, false);
    if (!short.ok) {
      assert.match(short.error, /8 characters/);
    }
  });
});

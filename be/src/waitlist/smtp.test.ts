import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSmtpConfig } from "./smtp";

describe("readSmtpConfig", () => {
  it("is not configured without a host and a from-address", () => {
    assert.equal(readSmtpConfig({}), null);
    assert.equal(readSmtpConfig({ SMTP_HOST: "smtp.gmail.com" }), null);
    assert.equal(readSmtpConfig({ SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "nope", SMTP_FROM: "a@b.com" }), null);
  });

  it("reads Gmail-style settings and leaves notify optional", () => {
    const config = readSmtpConfig({
      SMTP_HOST: " smtp.gmail.com ",
      SMTP_PORT: "587",
      SMTP_USER: "traccia@gmail.com",
      SMTP_PASS: "app-password",
      SMTP_FROM: "Traccia <traccia@gmail.com>",
    });
    assert.ok(config);
    if (config) {
      assert.equal(config.host, "smtp.gmail.com");
      assert.equal(config.port, 587);
      assert.equal(config.user, "traccia@gmail.com");
      assert.equal(config.password, "app-password");
      assert.equal(config.notifyTo, null);
    }
  });

  it("defaults the port to 587 and keeps the notify address", () => {
    const config = readSmtpConfig({
      SMTP_HOST: "smtp.gmail.com",
      SMTP_FROM: "Traccia <traccia@gmail.com>",
      WAITLIST_NOTIFY_TO: " alessio@example.com ",
    });
    assert.ok(config);
    if (config) {
      assert.equal(config.port, 587);
      assert.equal(config.user, null);
      assert.equal(config.notifyTo, "alessio@example.com");
    }
  });
});

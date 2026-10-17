import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNoticeMail } from "./emails";

describe("waitlist emails", () => {
  it("escapes the notice so a referral cannot inject HTML", () => {
    const mail = buildNoticeMail({
      email: "a@b.com",
      role: "coach",
      ref: null,
      consentedAt: new Date("2026-10-17T12:00:00.000Z"),
    });
    assert.match(mail.subject, /iscrizione/);
    assert.match(mail.text, /a@b.com/);
    assert.match(mail.text, /Coach o PT/);
    assert.match(mail.text, /nessuno/);
    assert.match(mail.text, /2026-10-17T12:00:00.000Z/);
    assert.match(mail.html, /#FFF8F1/);
    assert.match(mail.html, /#231A14/);
    assert.doesNotMatch(mail.html, /TODO/);

    const hostile = buildNoticeMail({
      email: "a<b>@c.com",
      role: "athlete",
      ref: null,
      consentedAt: new Date("2026-10-17T12:00:00.000Z"),
    });
    assert.match(hostile.html, /a&lt;b&gt;@c.com/);
    assert.doesNotMatch(hostile.html, /a<b>@c.com/);
  });
});

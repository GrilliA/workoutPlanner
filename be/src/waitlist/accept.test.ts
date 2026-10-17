import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptWaitlist, type NewWaitlistSignup, type WaitlistDeps } from "./accept";
import type { OutboundMail } from "./mailer";
import type { SmtpConfig } from "./smtp";

const now = new Date("2026-10-17T12:00:00.000Z");

const gmail: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 587,
  user: "traccia@gmail.com",
  password: "app-password",
  from: "Traccia <traccia@gmail.com>",
  notifyTo: "alessio@example.com",
};

const body = {
  email: "Coach@Example.com",
  role: "coach",
  consent: true,
  ref: "MARCO7",
  company: "",
};

const harness = (overrides: Partial<WaitlistDeps> = {}) => {
  const inserted: NewWaitlistSignup[] = [];
  const sent: OutboundMail[] = [];
  const marked: string[] = [];
  const logs: string[] = [];
  const deps: WaitlistDeps = {
    now,
    insertSignup: async (signup) => {
      inserted.push(signup);
      return "created";
    },
    markWelcomeSent: async (email) => {
      marked.push(email);
    },
    readMailConfig: () => gmail,
    sendMail: async (_config, mail) => {
      sent.push(mail);
    },
    log: (line) => {
      logs.push(line);
    },
    ...overrides,
  };
  return { deps, inserted, sent, marked, logs };
};

describe("acceptWaitlist", () => {
  it("stores a new signup and sends the welcome plus the notice", async () => {
    const { deps, inserted, sent, marked } = harness();
    const result = await acceptWaitlist(body, deps);

    assert.deepEqual(result, { status: 200, body: { ok: true } });
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.email, "coach@example.com");
    assert.equal(inserted[0]?.ref, "MARCO7");
    assert.equal(sent.length, 2);
    assert.equal(sent[0]?.to, "coach@example.com");
    assert.equal(sent[1]?.to, "alessio@example.com");
    assert.deepEqual(marked, ["coach@example.com"]);
  });

  it("answers success for a duplicate and does not send mail again", async () => {
    const { deps, sent } = harness({
      insertSignup: async () => "duplicate",
    });
    const result = await acceptWaitlist(body, deps);

    assert.deepEqual(result, { status: 200, body: { ok: true } });
    assert.equal(sent.length, 0);
  });

  it("answers success for a honeypot and stores nothing", async () => {
    const { deps, inserted, sent } = harness();
    const result = await acceptWaitlist({ ...body, company: "acme", email: "bad" }, deps);

    assert.deepEqual(result, { status: 200, body: { ok: true } });
    assert.equal(inserted.length, 0);
    assert.equal(sent.length, 0);
  });

  it("saves the signup and warns when SMTP is not configured", async () => {
    const { deps, inserted, sent, logs } = harness({
      readMailConfig: () => null,
    });
    const result = await acceptWaitlist(body, deps);

    assert.equal(result.status, 200);
    assert.equal(inserted.length, 1);
    assert.equal(sent.length, 0);
    assert.match(logs.join("\n"), /SMTP is not configured/);
  });

  it("keeps the signup when the welcome email fails, and still notifies", async () => {
    const { deps, sent, marked, logs } = harness({
      sendMail: async (_config, mail) => {
        sent.push(mail);
        if (mail.to === "coach@example.com") {
          throw new Error("mailbox full");
        }
      },
    });
    const result = await acceptWaitlist(body, deps);

    assert.equal(result.status, 200);
    assert.equal(sent.length, 2);
    assert.deepEqual(marked, []);
    assert.match(logs.join("\n"), /welcome email failed/);
  });

  it("rejects a signup without consent", async () => {
    const { deps, inserted } = harness();
    const result = await acceptWaitlist({ ...body, consent: false }, deps);

    assert.equal(result.status, 400);
    if ("error" in result.body) {
      assert.match(result.body.error, /consenso/);
    }
    assert.equal(inserted.length, 0);
  });
});

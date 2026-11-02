import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createWaitlistRateLimit } from "./rateLimit";

const run = (
  limit: ReturnType<typeof createWaitlistRateLimit>,
  ip: string,
  method = "POST",
) => {
  const headers = new Map<string, string>();
  let statusCode = 0;
  let nextCalled = false;
  const req = { ip, method, headers: {} } as Request;
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    nextCalled = true;
  };
  limit(req, res, next);
  return { statusCode, nextCalled, headers };
};

describe("waitlist rate limit", () => {
  it("limits each IP and leaves another IP alone", () => {
    let now = 1_000;
    const limit = createWaitlistRateLimit({ max: 2, windowMs: 1_000, now: () => now });

    assert.equal(run(limit, "1.1.1.1").nextCalled, true);
    assert.equal(run(limit, "1.1.1.1").nextCalled, true);
    const blocked = run(limit, "1.1.1.1");
    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.headers.get("Retry-After"), "1");

    assert.equal(run(limit, "2.2.2.2").nextCalled, true);

    now = 2_000;
    assert.equal(run(limit, "1.1.1.1").nextCalled, true);
  });

  it("does not count preflight", () => {
    const limit = createWaitlistRateLimit({ max: 1, windowMs: 1_000, now: () => 0 });
    assert.equal(run(limit, "1.1.1.1", "OPTIONS").nextCalled, true);
    assert.equal(run(limit, "1.1.1.1", "POST").nextCalled, true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { MAX_STARTS, sessionStartRateLimit } from "./sessionStartRateLimit";

const start = (userId: number) => {
  const headers = new Map<string, unknown>();
  let statusCode = 0;
  let body: unknown = null;
  let nextCalled = false;

  const req = { user: { id: userId } } as unknown as Request;
  const res = {
    setHeader(name: string, value: unknown) {
      headers.set(name, value);
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as unknown as Response;

  const next: NextFunction = () => {
    nextCalled = true;
  };

  sessionStartRateLimit(req, res, next);

  return { headers, statusCode, body, nextCalled };
};

describe("sessionStartRateLimit", () => {
  it("lets a user start 30 sessions, then answers 429 with Retry-After", () => {
    const userId = 1001;
    const allowed = Array.from({ length: MAX_STARTS }, () => start(userId));
    const refused = start(userId);

    assert.equal(allowed.every((result) => result.nextCalled), true);
    assert.equal(refused.nextCalled, false);
    assert.equal(refused.statusCode, 429);
    assert.deepEqual(refused.body, { error: "Too many sessions started. Try again later" });
    assert.equal(typeof refused.headers.get("Retry-After"), "number");
  });

  it("counts each user apart", () => {
    Array.from({ length: MAX_STARTS + 1 }, () => start(2001));

    assert.equal(start(2002).nextCalled, true);
  });
});

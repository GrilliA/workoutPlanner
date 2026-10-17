import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { applyWaitlistCors, PAGES_ORIGIN, parseWaitlistOrigins } from "./cors";

const run = (origin: string | undefined, method = "POST") => {
  const headers = new Map<string, string>();
  let statusCode = 0;
  let body: unknown;
  let ended = false;
  let nextCalled = false;
  const req = { headers: { origin }, method } as Request;
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
    end() {
      ended = true;
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  const previous = process.env.WAITLIST_CORS_ORIGINS;
  delete process.env.WAITLIST_CORS_ORIGINS;
  applyWaitlistCors(req, res, next);
  if (previous === undefined) {
    delete process.env.WAITLIST_CORS_ORIGINS;
  } else {
    process.env.WAITLIST_CORS_ORIGINS = previous;
  }

  return { headers, statusCode, body, ended, nextCalled };
};

describe("parseWaitlistOrigins", () => {
  it("defaults to the Pages origin and replaces it when configured", () => {
    assert.deepEqual(parseWaitlistOrigins(undefined), [PAGES_ORIGIN]);
    assert.deepEqual(parseWaitlistOrigins(" https://example.com , http://localhost:4321 "), [
      "https://example.com",
      "http://localhost:4321",
    ]);
  });
});

describe("applyWaitlistCors", () => {
  it("allows the Pages origin on POST and preflight", () => {
    const post = run(PAGES_ORIGIN, "POST");
    assert.equal(post.nextCalled, true);
    assert.equal(post.headers.get("Access-Control-Allow-Origin"), PAGES_ORIGIN);
    assert.equal(post.headers.has("Access-Control-Allow-Credentials"), false);

    const preflight = run(PAGES_ORIGIN, "OPTIONS");
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.ended, true);
    assert.equal(preflight.nextCalled, false);
    assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), "Content-Type, Accept");
  });

  it("allows a non-browser client with no Origin", () => {
    const result = run(undefined, "POST");
    assert.equal(result.nextCalled, true);
    assert.equal(result.headers.has("Access-Control-Allow-Origin"), false);
  });

  it("rejects any other browser origin", () => {
    const result = run("https://evil.example", "POST");
    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);
    assert.equal(result.headers.has("Access-Control-Allow-Origin"), false);
    assert.deepEqual(result.body, { error: "Origin non consentita" });
  });
});

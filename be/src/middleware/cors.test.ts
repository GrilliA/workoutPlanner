import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { applyCors, sessionRequestOriginAllowed } from "./cors";

const PAGES_ORIGIN = "https://grillia.github.io";

const run = (origin: string | undefined, method = "GET") => {
  const headers = new Map<string, string>();
  let statusCode = 0;
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
    end() {
      ended = true;
      return this;
    },
  } as unknown as Response;

  const next: NextFunction = () => {
    nextCalled = true;
  };

  applyCors(req, res, next);

  return { headers, statusCode, ended, nextCalled };
};

describe("sessionRequestOriginAllowed", () => {
  it("allows the Pages origin, local dev, and non-browser clients", () => {
    assert.equal(sessionRequestOriginAllowed(PAGES_ORIGIN), true);
    assert.equal(sessionRequestOriginAllowed("http://localhost:5173"), true);
    assert.equal(sessionRequestOriginAllowed(undefined), true);
  });

  it("rejects other browser origins", () => {
    assert.equal(sessionRequestOriginAllowed("https://evil.example"), false);
    assert.equal(sessionRequestOriginAllowed("null"), false);
    assert.equal(sessionRequestOriginAllowed(["https://grillia.github.io"]), false);
  });
});

describe("applyCors", () => {
  it("echoes the Pages origin and allows credentials", () => {
    const { headers, nextCalled, ended } = run(PAGES_ORIGIN);

    assert.equal(headers.get("Access-Control-Allow-Origin"), PAGES_ORIGIN);
    assert.equal(headers.get("Access-Control-Allow-Credentials"), "true");
    assert.equal(headers.get("Vary"), "Origin");
    assert.equal(nextCalled, true);
    assert.equal(ended, false);
  });

  it("does not allow an unknown origin", () => {
    const { headers, nextCalled } = run("https://evil.example");

    assert.equal(headers.has("Access-Control-Allow-Origin"), false);
    assert.equal(headers.has("Access-Control-Allow-Credentials"), false);
    assert.equal(nextCalled, true);
  });

  it("answers preflight without calling the route", () => {
    const { statusCode, ended, nextCalled, headers } = run(PAGES_ORIGIN, "OPTIONS");

    assert.equal(statusCode, 204);
    assert.equal(ended, true);
    assert.equal(nextCalled, false);
    assert.equal(
      headers.get("Access-Control-Allow-Headers"),
      "Authorization, Content-Type, Accept, X-Client",
    );
  });
});

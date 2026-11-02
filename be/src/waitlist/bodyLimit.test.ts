import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { handleWaitlistBodyError, rejectLargeWaitlistBody } from "./bodyLimit";

const response = () => {
  let statusCode = 0;
  let body: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Response;
  return { res, read: () => ({ statusCode, body }) };
};

describe("waitlist body limit", () => {
  it("rejects a content-length above 2kb and lets a small body through", () => {
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };
    const large = response();
    rejectLargeWaitlistBody(
      { headers: { "content-length": "3000" } } as Request,
      large.res,
      next,
    );
    assert.equal(nextCalled, false);
    assert.equal(large.read().statusCode, 413);

    const small = response();
    rejectLargeWaitlistBody(
      { headers: { "content-length": "100" } } as Request,
      small.res,
      next,
    );
    assert.equal(nextCalled, true);
  });

  it("turns a parser failure into a client error", () => {
    let forwarded = false;
    const next: NextFunction = () => {
      forwarded = true;
    };
    const broken = response();
    handleWaitlistBodyError({ type: "entity.parse.failed" }, {} as Request, broken.res, next);
    assert.equal(forwarded, false);
    assert.equal(broken.read().statusCode, 400);
  });

  it("turns a parser 413 into the same JSON error", () => {
    let forwarded = false;
    const next: NextFunction = () => {
      forwarded = true;
    };
    const { res, read } = response();
    handleWaitlistBodyError({ status: 413, type: "entity.too.large" }, {} as Request, res, next);
    assert.equal(forwarded, false);
    assert.deepEqual(read(), { statusCode: 413, body: { error: "Richiesta troppo grande" } });
  });
});

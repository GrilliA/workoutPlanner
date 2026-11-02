import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REFRESH_COOKIE_PATH, refreshCookieSettings } from "./refreshCookie";

describe("refreshCookieSettings", () => {
  it("uses a cross-site cookie in production", () => {
    assert.deepEqual(refreshCookieSettings("production"), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      path: REFRESH_COOKIE_PATH,
    });
    assert.equal(REFRESH_COOKIE_PATH, "/api/auth");
  });

  it("keeps a lax cookie outside production", () => {
    assert.deepEqual(refreshCookieSettings("development"), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: REFRESH_COOKIE_PATH,
    });
    assert.equal(refreshCookieSettings(undefined).sameSite, "lax");
    assert.equal(refreshCookieSettings("").partitioned, undefined);
  });
});

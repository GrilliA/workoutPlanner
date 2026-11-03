import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;

const PASSWORD = "smoketest-password";
const IMPOSSIBLE_DATES = ["2026-13-45", "2026-02-30", "2026-02-29"];

const requireScratchDatabase = (): void => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";

  if (!databaseName || databaseName === "workout_planner") {
    throw new Error("Point DATABASE_URL at a scratch database for the e2e smoke.");
  }
};

const asObject = (value: unknown): JsonObject => {
  assert.equal(typeof value, "object", `expected object, got ${typeof value}`);
  assert.ok(value !== null);
  return value as JsonObject;
};

const failMessage = (status: number, body: unknown): string =>
  `status ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`;

const api = async (
  baseUrl: string,
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> => {
  const headers = new Headers({ Accept: "application/json", "X-Client": "mobile" });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return { status: response.status, body: text.length > 0 ? JSON.parse(text) : null };
};

describe("workout schedule dates smoke", { concurrency: false }, () => {
  let server: Server | undefined;
  let closeDb: (() => Promise<void>) | undefined;
  let baseUrl = "";

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let token = "";
  let workoutId = 0;
  let workoutDayId = 0;

  const schedulePath = (path: string): string => `/api/workouts/${workoutId}/schedule${path}`;

  const assertRefused = (
    result: { status: number; body: unknown },
    label: string,
    error: string,
  ): void => {
    assert.equal(result.status, 400, `${label} ${failMessage(result.status, result.body)}`);
    assert.deepEqual(result.body, { error }, label);
  };

  before(async () => {
    requireScratchDatabase();

    const [{ app }, db] = await Promise.all([import("../app"), import("../db")]);

    closeDb = db.closeDb;
    server = app.listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      body: { email: `schedule.athlete.${suffix}@example.com`, password: PASSWORD },
    });
    assert.equal(registered.status, 201, failMessage(registered.status, registered.body));
    token = String(asObject(registered.body).accessToken);

    const created = await api(baseUrl, "POST", "/api/workouts/program", {
      token,
      body: {
        name: "Calendario",
        days: [
          {
            name: "Lunedì",
            sortOrder: 0,
            weekdays: [0],
            exercises: [
              { name: "Panca", setPrescriptions: [{ setNumber: 1, reps: 5, restSec: 90 }] },
            ],
          },
        ],
      },
    });
    assert.equal(created.status, 201, failMessage(created.status, created.body));
    workoutId = Number(asObject(created.body).id);

    const detail = await api(baseUrl, "GET", `/api/workouts/${workoutId}`, { token });
    assert.equal(detail.status, 200, failMessage(detail.status, detail.body));
    workoutDayId = Number((asObject(detail.body).days as JsonObject[])[0]?.id);
  });

  after(async () => {
    if (server) {
      const httpServer = server;
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
        httpServer.closeAllConnections();
      });
    }

    if (closeDb) {
      await closeDb();
    }
  });

  for (const date of IMPOSSIBLE_DATES) {
    it(`refuses ${date} on every calendar route`, async () => {
      assertRefused(
        await api(baseUrl, "GET", schedulePath(`/today?date=${date}`), { token }),
        "today",
        "date must be YYYY-MM-DD",
      );
      assertRefused(
        await api(baseUrl, "GET", schedulePath(`/week?from=${date}`), { token }),
        "week",
        "from must be YYYY-MM-DD",
      );
      assertRefused(
        await api(baseUrl, "POST", schedulePath("/overrides"), {
          token,
          body: { scheduledDate: date, workoutDayId },
        }),
        "create override",
        "scheduledDate must be YYYY-MM-DD",
      );
      assertRefused(
        await api(baseUrl, "DELETE", schedulePath(`/overrides/${date}`), { token }),
        "delete override",
        "date must be YYYY-MM-DD",
      );
    });
  }

  it("answers 404 on a missing workout before looking at the date", async () => {
    const missing = await api(
      baseUrl,
      "GET",
      "/api/workouts/2147483647/schedule/today?date=2026-02-30",
      { token },
    );
    assert.equal(missing.status, 404, failMessage(missing.status, missing.body));
    assert.deepEqual(missing.body, { error: "Workout not found" });
  });

  it("answers 404 on another user's workout before looking at the date", async () => {
    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      body: { email: `schedule.other.${suffix}@example.com`, password: PASSWORD },
    });
    assert.equal(registered.status, 201, failMessage(registered.status, registered.body));
    const otherToken = String(asObject(registered.body).accessToken);

    const results = await Promise.all([
      api(baseUrl, "GET", schedulePath("/today?date=2026-02-30"), { token: otherToken }),
      api(baseUrl, "GET", schedulePath("/week?from=2026-02-30"), { token: otherToken }),
      api(baseUrl, "POST", schedulePath("/overrides"), {
        token: otherToken,
        body: { scheduledDate: "2026-02-30", workoutDayId },
      }),
      api(baseUrl, "DELETE", schedulePath("/overrides/2026-02-30"), { token: otherToken }),
    ]);

    for (const result of results) {
      assert.equal(result.status, 404, failMessage(result.status, result.body));
      assert.deepEqual(result.body, { error: "Workout not found" });
    }
  });

  it("refuses a scheduledDate that is not a string", async () => {
    assertRefused(
      await api(baseUrl, "POST", schedulePath("/overrides"), {
        token,
        body: { scheduledDate: 20260713, workoutDayId },
      }),
      "create override",
      "scheduledDate must be YYYY-MM-DD",
    );
  });

  it("still answers for real dates, leap day included", async () => {
    const leapDay = await api(baseUrl, "GET", schedulePath("/today?date=2028-02-29"), { token });
    assert.equal(leapDay.status, 200, failMessage(leapDay.status, leapDay.body));
    assert.equal(asObject(leapDay.body).date, "2028-02-29");

    const monday = await api(baseUrl, "GET", schedulePath("/today?date=2026-07-13"), { token });
    assert.equal(monday.status, 200, failMessage(monday.status, monday.body));
    assert.equal(asObject(monday.body).date, "2026-07-13");
    assert.equal(asObject(monday.body).weekday, 0);

    const week = await api(baseUrl, "GET", schedulePath("/week?from=2028-02-27"), { token });
    assert.equal(week.status, 200, failMessage(week.status, week.body));
    assert.deepEqual(
      (week.body as JsonObject[]).map((entry) => entry.date),
      [
        "2028-02-27",
        "2028-02-28",
        "2028-02-29",
        "2028-03-01",
        "2028-03-02",
        "2028-03-03",
        "2028-03-04",
      ],
    );

    const noDate = await api(baseUrl, "GET", schedulePath("/today"), { token });
    assert.equal(noDate.status, 200, failMessage(noDate.status, noDate.body));
    assert.equal(asObject(noDate.body).date, todayInRome());
  });

  it("creates and deletes an override on a real date", async () => {
    const createdOverride = await api(baseUrl, "POST", schedulePath("/overrides"), {
      token,
      body: { scheduledDate: "2028-02-29", workoutDayId },
    });
    assert.equal(
      createdOverride.status,
      201,
      failMessage(createdOverride.status, createdOverride.body),
    );
    assert.equal(asObject(createdOverride.body).scheduledDate, "2028-02-29");

    const deleted = await api(baseUrl, "DELETE", schedulePath("/overrides/2028-02-29"), { token });
    assert.equal(deleted.status, 204, failMessage(deleted.status, deleted.body));
  });
});

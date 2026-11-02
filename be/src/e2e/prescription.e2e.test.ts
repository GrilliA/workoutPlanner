import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;

const PASSWORD = "smoketest-password";

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
  options: { token?: string; mobile?: boolean; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> => {
  const headers = new Headers({ Accept: "application/json" });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options.mobile) {
    headers.set("X-Client", "mobile");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return { status: response.status, body: text.length > 0 ? JSON.parse(text) : null };
};

const squatSets = [
  { setNumber: 1, reps: 5, loadValue: 80, loadUnit: "percent_1rm", rir: 2, restSec: 180 },
  { setNumber: 2, reps: 8, repsMax: 10, loadValue: 102.5, loadUnit: "kg", restSec: 120 },
];

const expectedSquatSets = [
  {
    setNumber: 1,
    reps: 5,
    repsMax: null,
    loadValue: 80,
    loadUnit: "percent_1rm",
    rir: 2,
    restSec: 180,
  },
  {
    setNumber: 2,
    reps: 8,
    repsMax: 10,
    loadValue: 102.5,
    loadUnit: "kg",
    rir: null,
    restSec: 120,
  },
];

const programBody = (notes: string, sets: unknown[]) => ({
  name: "Forza con carichi",
  days: [
    {
      name: "Lower",
      sortOrder: 0,
      weekdays: [0],
      exercises: [{ name: "Squat", notes, setPrescriptions: sets }],
    },
  ],
});

const firstExerciseOf = (template: unknown): JsonObject => {
  const days = asObject(template).days as JsonObject[];
  const exercises = days[0]?.exercises as JsonObject[];
  return asObject(exercises[0]);
};

describe("prescription fields smoke", { concurrency: false }, () => {
  let server: Server | undefined;
  let closeDb: (() => Promise<void>) | undefined;
  let baseUrl = "";

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let coachToken = "";
  let athleteToken = "";
  let athleteId = 0;
  let templateId = 0;

  before(async () => {
    requireScratchDatabase();

    const [{ app }, db] = await Promise.all([import("../app"), import("../db")]);

    closeDb = db.closeDb;
    server = app.listen(0);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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

  it("coach saves a template with notes, range, load and RIR and reads them back", async () => {
    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      body: { email: `prescription.coach.${suffix}@example.com`, password: PASSWORD },
    });
    assert.equal(registered.status, 201, failMessage(registered.status, registered.body));
    coachToken = String(asObject(registered.body).accessToken);

    const created = await api(baseUrl, "POST", "/api/coach/templates/program", {
      token: coachToken,
      body: programBody("Fermo 1s in buca", squatSets),
    });
    assert.equal(created.status, 201, failMessage(created.status, created.body));
    templateId = Number(asObject(created.body).id);

    const loaded = await api(baseUrl, "GET", `/api/coach/templates/${templateId}`, {
      token: coachToken,
    });
    assert.equal(loaded.status, 200, failMessage(loaded.status, loaded.body));
    const squat = firstExerciseOf(loaded.body);
    assert.equal(squat.notes, "Fermo 1s in buca");
    assert.deepEqual(squat.setPrescriptions, expectedSquatSets);
  });

  it("an edit replaces the fields instead of keeping the old ones", async () => {
    const edited = await api(baseUrl, "PUT", `/api/coach/templates/${templateId}/program`, {
      token: coachToken,
      body: programBody("", [{ setNumber: 1, reps: 6, restSec: 150 }]),
    });
    assert.equal(edited.status, 200, failMessage(edited.status, edited.body));

    const loaded = await api(baseUrl, "GET", `/api/coach/templates/${templateId}`, {
      token: coachToken,
    });
    const squat = firstExerciseOf(loaded.body);
    assert.equal(squat.notes, null);
    assert.deepEqual(squat.setPrescriptions, [
      {
        setNumber: 1,
        reps: 6,
        repsMax: null,
        loadValue: null,
        loadUnit: null,
        rir: null,
        restSec: 150,
      },
    ]);

    const restored = await api(baseUrl, "PUT", `/api/coach/templates/${templateId}/program`, {
      token: coachToken,
      body: programBody("Fermo 1s in buca", squatSets),
    });
    assert.equal(restored.status, 200, failMessage(restored.status, restored.body));
  });

  it("rejects a load without a unit", async () => {
    const rejected = await api(baseUrl, "PUT", `/api/coach/templates/${templateId}/program`, {
      token: coachToken,
      body: programBody("", [{ setNumber: 1, reps: 5, loadValue: 80, restSec: 90 }]),
    });
    assert.equal(rejected.status, 400, failMessage(rejected.status, rejected.body));
  });

  it("rejects more than 30 sets for one exercise", async () => {
    const sets = Array.from({ length: 31 }, (_, index) => ({
      setNumber: index + 1,
      reps: 5,
      restSec: 90,
    }));
    const rejected = await api(baseUrl, "PUT", `/api/coach/templates/${templateId}/program`, {
      token: coachToken,
      body: programBody("", sets),
    });
    assert.equal(rejected.status, 400, failMessage(rejected.status, rejected.body));
    assert.deepEqual(rejected.body, { error: "setPrescriptions must have at most 30 sets" });
  });

  it("the athlete gets the same prescription in the assigned copy", async () => {
    const invite = await api(baseUrl, "GET", "/api/coach/invite-code", { token: coachToken });
    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      mobile: true,
      body: { email: `prescription.athlete.${suffix}@example.com`, password: PASSWORD },
    });
    assert.equal(registered.status, 201, failMessage(registered.status, registered.body));
    const athlete = asObject(registered.body);
    athleteToken = String(athlete.accessToken);
    athleteId = Number(asObject(athlete.user).id);

    const linked = await api(baseUrl, "POST", "/api/athlete/coach/link", {
      token: athleteToken,
      mobile: true,
      body: { code: asObject(invite.body).code },
    });
    assert.equal(linked.status, 201, failMessage(linked.status, linked.body));

    const today = todayInRome();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.parse(`${today}T00:00:00Z`) + thirtyDaysMs)
      .toISOString()
      .slice(0, 10);
    const assigned = await api(baseUrl, "POST", "/api/coach/assignments", {
      token: coachToken,
      body: { athleteId, templateId, startsAt: today, expiresAt },
    });
    assert.equal(assigned.status, 201, failMessage(assigned.status, assigned.body));
    const workoutId = Number(asObject(asObject(assigned.body).workout).id);

    const detail = await api(baseUrl, "GET", `/api/workouts/${workoutId}`, {
      token: athleteToken,
      mobile: true,
    });
    assert.equal(detail.status, 200, failMessage(detail.status, detail.body));
    const dayId = Number((asObject(detail.body).days as JsonObject[])[0]?.id);

    const exercises = await api(
      baseUrl,
      "GET",
      `/api/workouts/${workoutId}/days/${dayId}/exercises`,
      { token: athleteToken, mobile: true },
    );
    assert.equal(exercises.status, 200, failMessage(exercises.status, exercises.body));
    const squat = asObject((exercises.body as JsonObject[])[0]);
    assert.equal(squat.notes, "Fermo 1s in buca");
    assert.deepEqual(squat.setPrescriptions, expectedSquatSets);
  });
});

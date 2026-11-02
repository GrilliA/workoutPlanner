import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

type JsonObject = Record<string, unknown>;

const PASSWORD = "smoketest-password";
const MAX_SETS_PER_EXERCISE = 30;
const MAX_SETS_PER_SESSION = 200;
const MAX_STARTS = 30;
const EXERCISE_COUNT = 8;

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

/** Every position of the day: exercise by exercise, set 1 to 30. */
const allPositions = (exerciseIds: number[]) =>
  exerciseIds.flatMap((exerciseId) =>
    Array.from({ length: MAX_SETS_PER_EXERCISE }, (_, index) => ({
      exerciseId,
      setNumber: index + 1,
    })),
  );

describe("session set limits smoke", { concurrency: false }, () => {
  let server: Server | undefined;
  let closeDb: (() => Promise<void>) | undefined;
  let baseUrl = "";

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let token = "";
  let workoutId = 0;
  let workoutDayId = 0;
  let exerciseIds: number[] = [];
  let sessionId = 0;

  const startSession = () =>
    api(baseUrl, "POST", `/api/workouts/${workoutId}/sessions`, {
      token,
      body: { workoutDayId },
    });

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

  it("an athlete builds a day with 8 exercises and starts a session", async () => {
    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      body: { email: `limits.athlete.${suffix}@example.com`, password: PASSWORD },
    });
    assert.equal(registered.status, 201, failMessage(registered.status, registered.body));
    token = String(asObject(registered.body).accessToken);

    const created = await api(baseUrl, "POST", "/api/workouts/program", {
      token,
      body: {
        name: "Limiti",
        days: [
          {
            name: "Tutto",
            sortOrder: 0,
            weekdays: [0],
            exercises: Array.from({ length: EXERCISE_COUNT }, (_, index) => ({
              name: `Esercizio ${index + 1}`,
              setPrescriptions: [{ setNumber: 1, reps: 5, restSec: 90 }],
            })),
          },
        ],
      },
    });
    assert.equal(created.status, 201, failMessage(created.status, created.body));
    workoutId = Number(asObject(created.body).id);

    const detail = await api(baseUrl, "GET", `/api/workouts/${workoutId}`, { token });
    assert.equal(detail.status, 200, failMessage(detail.status, detail.body));
    workoutDayId = Number((asObject(detail.body).days as JsonObject[])[0]?.id);

    const exercises = await api(
      baseUrl,
      "GET",
      `/api/workouts/${workoutId}/days/${workoutDayId}/exercises`,
      { token },
    );
    assert.equal(exercises.status, 200, failMessage(exercises.status, exercises.body));
    exerciseIds = (exercises.body as JsonObject[]).map((exercise) => Number(exercise.id));
    assert.equal(exerciseIds.length, EXERCISE_COUNT);

    const started = await startSession();
    assert.equal(started.status, 201, failMessage(started.status, started.body));
    sessionId = Number(asObject(started.body).id);
  });

  it("refuses a single set past set number 30", async () => {
    const posted = await api(baseUrl, "POST", `/api/sessions/${sessionId}/sets`, {
      token,
      body: { exerciseId: exerciseIds[0], setNumber: MAX_SETS_PER_EXERCISE + 1, reps: 5 },
    });
    assert.equal(posted.status, 400, failMessage(posted.status, posted.body));
    assert.deepEqual(posted.body, { error: "setNumber must be an integer between 1 and 30" });

    const put = await api(
      baseUrl,
      "PUT",
      `/api/sessions/${sessionId}/sets/${exerciseIds[0]}/${MAX_SETS_PER_EXERCISE + 1}`,
      { token, body: { reps: 5 } },
    );
    assert.equal(put.status, 400, failMessage(put.status, put.body));
  });

  it("stops single sets at 200 per session, also sent in parallel, but lets a logged set change", async () => {
    const positions = allPositions(exerciseIds);
    const placesLeft = 10;
    const sentInParallel = 30;
    const sequential = positions.slice(0, MAX_SETS_PER_SESSION - placesLeft);
    const parallel = positions.slice(
      MAX_SETS_PER_SESSION - placesLeft,
      MAX_SETS_PER_SESSION - placesLeft + sentInParallel,
    );
    const putSet = (position: { exerciseId: number; setNumber: number }, reps: number) =>
      api(
        baseUrl,
        "PUT",
        `/api/sessions/${sessionId}/sets/${position.exerciseId}/${position.setNumber}`,
        { token, body: { reps } },
      );

    for (const position of sequential) {
      const saved = await putSet(position, 5);
      assert.equal(saved.status, 200, failMessage(saved.status, saved.body));
    }

    // 30 new sets at once for the last 10 places: the session lock lets exactly 10 in.
    const raced = await Promise.all(parallel.map((position) => putSet(position, 5)));
    const statuses = raced.map((result) => result.status);
    assert.equal(statuses.filter((status) => status === 200).length, placesLeft);
    assert.equal(statuses.filter((status) => status === 409).length, sentInParallel - placesLeft);

    const stored = await api(baseUrl, "GET", `/api/sessions/${sessionId}`, { token });
    assert.equal(stored.status, 200, failMessage(stored.status, stored.body));
    assert.equal((asObject(stored.body).sets as JsonObject[]).length, MAX_SETS_PER_SESSION);

    // The parallel writes reach set 10 of the last exercise: its set 30 is still free.
    const lastExerciseId = exerciseIds[exerciseIds.length - 1];
    assert.ok(lastExerciseId !== undefined);
    const next = { exerciseId: lastExerciseId, setNumber: MAX_SETS_PER_EXERCISE };
    const posted = await api(baseUrl, "POST", `/api/sessions/${sessionId}/sets`, {
      token,
      body: { ...next, reps: 5 },
    });
    assert.equal(posted.status, 409, failMessage(posted.status, posted.body));
    assert.deepEqual(posted.body, { error: "Session already has 200 sets" });

    const putNew = await api(
      baseUrl,
      "PUT",
      `/api/sessions/${sessionId}/sets/${next.exerciseId}/${next.setNumber}`,
      { token, body: { reps: 5 } },
    );
    assert.equal(putNew.status, 409, failMessage(putNew.status, putNew.body));

    const [first] = positions;
    assert.ok(first);
    const putExisting = await api(
      baseUrl,
      "PUT",
      `/api/sessions/${sessionId}/sets/${first.exerciseId}/${first.setNumber}`,
      { token, body: { reps: 6 } },
    );
    assert.equal(putExisting.status, 200, failMessage(putExisting.status, putExisting.body));
  });

  it("a close past the caps keeps the 200 sets logged first instead of failing", async () => {
    const positions = allPositions(exerciseIds);
    const firstTime = Date.now() - positions.length * 1000;
    const sets = positions.map((position, index) => ({
      ...position,
      reps: 5,
      weightKg: null,
      rir: null,
      tutSec: null,
      loggedAt: new Date(firstTime + index * 1000).toISOString(),
    }));
    const pastSetNumberCap = {
      exerciseId: exerciseIds[0],
      setNumber: MAX_SETS_PER_EXERCISE + 1,
      reps: 5,
      loggedAt: new Date(firstTime).toISOString(),
    };

    const closed = await api(baseUrl, "PATCH", `/api/sessions/${sessionId}`, {
      token,
      body: { status: "completed", sets: [pastSetNumberCap, ...sets] },
    });
    assert.equal(closed.status, 200, failMessage(closed.status, closed.body));

    const saved = asObject(closed.body);
    const savedSets = saved.sets as JsonObject[];
    const savedKeys = new Set(savedSets.map((set) => `${set.exerciseId}/${set.setNumber}`));
    const expectedKeys = positions
      .slice(0, MAX_SETS_PER_SESSION)
      .map((position) => `${position.exerciseId}/${position.setNumber}`);

    assert.equal(saved.status, "completed");
    assert.equal(savedSets.length, MAX_SETS_PER_SESSION);
    assert.deepEqual([...savedKeys].sort(), [...expectedKeys].sort());
  });

  it("answers 429 once a user has started 30 sessions", async () => {
    // The first test made start 1: starts 2 to 30 still pass.
    const nextStarts = Array.from({ length: MAX_STARTS - 1 }, (_, index) => index + 2);

    for (const startNumber of nextStarts) {
      const started = await startSession();
      assert.equal(
        started.status,
        201,
        `start ${startNumber}: ${failMessage(started.status, started.body)}`,
      );

      const abandoned = await api(
        baseUrl,
        "PATCH",
        `/api/sessions/${Number(asObject(started.body).id)}`,
        { token, body: { status: "abandoned" } },
      );
      assert.equal(abandoned.status, 200, failMessage(abandoned.status, abandoned.body));
    }

    const refused = await startSession();
    assert.equal(refused.status, 429, failMessage(refused.status, refused.body));
    assert.deepEqual(refused.body, { error: "Too many sessions started. Try again later" });
  });
});

import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { dayBefore, todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
};

type AuthTokens = {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
};

type Assignment = {
  id: number;
  workoutId: number;
  status: string;
  startsAt: string;
  expiresAt: string;
};

type Workout = {
  id: number;
  isActive: boolean;
};

type Session = {
  id: number;
  workoutId: number;
  workoutDayId: number | null;
  status: string;
};

const PASSWORD = "smoketest-password";

const addCalendarDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const databaseNameFromUrl = (databaseUrl: string): string => {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
};

const requireScratchDatabase = (): void => {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for e2e smoke");
  }

  if (databaseNameFromUrl(databaseUrl) === "workout_planner") {
    throw new Error(
      "Refusing to run e2e smoke against workout_planner. Point DATABASE_URL at a scratch database.",
    );
  }

  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is required for e2e smoke");
  }
};

const asObject = (value: unknown): JsonObject => {
  assert.equal(typeof value, "object", `expected object, got ${typeof value}`);
  assert.ok(value !== null);
  return value as JsonObject;
};

const isoDate = (value: unknown): string => String(value).slice(0, 10);

const uniqueSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const api = async (
  baseUrl: string,
  method: string,
  path: string,
  options: {
    token?: string;
    mobile?: boolean;
    body?: unknown;
  } = {},
): Promise<{ status: number; body: unknown }> => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

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
  let body: unknown = null;

  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body };
};

const failMessage = (status: number, body: unknown): string =>
  `status ${status}: ${typeof body === "string" ? body : JSON.stringify(body)}`;

describe("paid loop smoke", { concurrency: false }, () => {
  let server: Server | undefined;
  let closeDb: (() => Promise<void>) | undefined;
  let baseUrl = "";

  const suffix = uniqueSuffix();
  const coachEmail = `smoke.coach.${suffix}@example.com`;
  const athleteEmail = `smoke.athlete.${suffix}@example.com`;

  const today = todayInRome();
  const firstExpiresAt = addCalendarDays(today, 40);
  const secondStartsAt = addCalendarDays(today, 10);
  const secondExpiresAt = addCalendarDays(today, 70);
  const expectedTruncatedExpiresAt = dayBefore(secondStartsAt);

  let coach!: AuthTokens;
  let athlete!: AuthTokens;
  let inviteCode!: string;
  let firstAssignment!: Assignment;
  let firstWorkout!: Workout;
  let completedSession!: Session;

  before(async () => {
    requireScratchDatabase();

    const [{ app }, db] = await Promise.all([
      import("../app"),
      import("../db"),
    ]);

    closeDb = db.closeDb;
    server = app.listen(0);
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
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

  it("coach registers and receives an invite code", async () => {
    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      body: { email: coachEmail, password: PASSWORD, name: "Smoke Coach" },
    });
    assert.equal(
      registered.status,
      201,
      failMessage(registered.status, registered.body),
    );

    const payload = asObject(registered.body);
    const user = asObject(payload.user) as AuthUser;
    assert.equal(user.role, "coach");
    assert.equal(typeof payload.accessToken, "string");
    coach = {
      user,
      accessToken: payload.accessToken as string,
    };

    const invite = await api(baseUrl, "GET", "/api/coach/invite-code", {
      token: coach.accessToken,
    });
    assert.equal(invite.status, 200, failMessage(invite.status, invite.body));
    const inviteBody = asObject(invite.body);
    assert.equal(typeof inviteBody.code, "string");
    assert.ok(String(inviteBody.code).length > 0);
    inviteCode = String(inviteBody.code);
  });

  it("athlete registers, redeems the code, and appears in the coach clients", async () => {
    const registered = await api(baseUrl, "POST", "/api/auth/register", {
      mobile: true,
      body: { email: athleteEmail, password: PASSWORD, name: "Smoke Athlete" },
    });
    assert.equal(
      registered.status,
      201,
      failMessage(registered.status, registered.body),
    );

    const payload = asObject(registered.body);
    const user = asObject(payload.user) as AuthUser;
    assert.equal(user.role, "athlete");
    assert.equal(typeof payload.accessToken, "string");
    assert.equal(typeof payload.refreshToken, "string");
    athlete = {
      user,
      accessToken: payload.accessToken as string,
      refreshToken: payload.refreshToken as string,
    };

    const linked = await api(baseUrl, "POST", "/api/athlete/coach/link", {
      token: athlete.accessToken,
      mobile: true,
      body: { code: inviteCode },
    });
    assert.equal(linked.status, 201, failMessage(linked.status, linked.body));
    const linkedBody = asObject(linked.body);
    const linkedCoach = asObject(linkedBody.coach);
    assert.equal(linkedCoach.coachId, coach.user.id);

    const clients = await api(baseUrl, "GET", "/api/coach/clients", {
      token: coach.accessToken,
    });
    assert.equal(clients.status, 200, failMessage(clients.status, clients.body));
    assert.ok(Array.isArray(clients.body));
    const client = (clients.body as JsonObject[]).find(
      (row) => row.id === athlete.user.id,
    );
    assert.ok(client, "coach clients should include the linked athlete");
    assert.equal(client.email, athleteEmail);
  });

  it("coach assigns a program starting today and the athlete can train on it", async () => {
    const assigned = await api(baseUrl, "POST", "/api/coach/assignments", {
      token: coach.accessToken,
      body: {
        athleteId: athlete.user.id,
        startsAt: today,
        expiresAt: firstExpiresAt,
        name: "Smoke A",
      },
    });
    assert.equal(
      assigned.status,
      201,
      failMessage(assigned.status, assigned.body),
    );

    const assignedBody = asObject(assigned.body);
    firstAssignment = asObject(assignedBody.assignment) as Assignment;
    firstWorkout = asObject(assignedBody.workout) as Workout;
    assert.equal(firstAssignment.status, "active");
    assert.equal(firstAssignment.workoutId, firstWorkout.id);
    assert.equal(isoDate(firstAssignment.startsAt), today);
    assert.equal(isoDate(firstAssignment.expiresAt), firstExpiresAt);

    const active = await api(baseUrl, "GET", "/api/assignments/active", {
      token: athlete.accessToken,
      mobile: true,
    });
    assert.equal(active.status, 200, failMessage(active.status, active.body));
    const activeAssignment = asObject(asObject(active.body).assignment);
    assert.equal(activeAssignment.id, firstAssignment.id);
    assert.equal(activeAssignment.workoutId, firstWorkout.id);

    const started = await api(
      baseUrl,
      "POST",
      `/api/workouts/${firstWorkout.id}/sessions`,
      {
        token: athlete.accessToken,
        mobile: true,
        body: {},
      },
    );
    assert.equal(started.status, 201, failMessage(started.status, started.body));
    const session = asObject(started.body) as Session;
    assert.equal(typeof session.workoutDayId, "number");
    assert.equal(session.workoutId, firstWorkout.id);

    const completed = await api(baseUrl, "PATCH", `/api/sessions/${session.id}`, {
      token: athlete.accessToken,
      mobile: true,
      body: { status: "completed", sets: [] },
    });
    assert.equal(
      completed.status,
      200,
      failMessage(completed.status, completed.body),
    );
    completedSession = asObject(completed.body) as Session;
    assert.equal(completedSession.status, "completed");
  });

  it("coach sees the completed session on the client", async () => {
    const detail = await api(
      baseUrl,
      "GET",
      `/api/coach/clients/${athlete.user.id}`,
      { token: coach.accessToken },
    );
    assert.equal(detail.status, 200, failMessage(detail.status, detail.body));
    const detailBody = asObject(detail.body);
    assert.ok(Array.isArray(detailBody.recentSessions));
    const recent = detailBody.recentSessions as JsonObject[];
    assert.ok(
      recent.some((row) => row.sessionId === completedSession.id),
      "recentSessions should include the completed session",
    );
  });

  it("a later assignment does not deactivate the current program", async () => {
    const assigned = await api(baseUrl, "POST", "/api/coach/assignments", {
      token: coach.accessToken,
      body: {
        athleteId: athlete.user.id,
        startsAt: secondStartsAt,
        expiresAt: secondExpiresAt,
        name: "Smoke B",
      },
    });
    assert.equal(
      assigned.status,
      201,
      failMessage(assigned.status, assigned.body),
    );

    const second = asObject(asObject(assigned.body).assignment) as Assignment;
    const secondWorkout = asObject(asObject(assigned.body).workout) as Workout;
    assert.equal(second.status, "scheduled");
    assert.notEqual(secondWorkout.id, firstWorkout.id);

    const active = await api(baseUrl, "GET", "/api/assignments/active", {
      token: athlete.accessToken,
      mobile: true,
    });
    assert.equal(active.status, 200, failMessage(active.status, active.body));
    const activeBody = asObject(active.body);
    assert.ok(
      activeBody.assignment !== null,
      "active assignment must not become null after scheduling a later program",
    );
    const activeAssignment = asObject(activeBody.assignment);
    assert.equal(activeAssignment.id, firstAssignment.id);
    assert.equal(activeAssignment.workoutId, firstWorkout.id);
    assert.equal(isoDate(activeAssignment.expiresAt), expectedTruncatedExpiresAt);

    const started = await api(
      baseUrl,
      "POST",
      `/api/workouts/${firstWorkout.id}/sessions`,
      {
        token: athlete.accessToken,
        mobile: true,
        body: {},
      },
    );
    assert.equal(
      started.status,
      201,
      failMessage(started.status, started.body),
    );
  });
});

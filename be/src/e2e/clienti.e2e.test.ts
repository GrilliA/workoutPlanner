import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;
type ApiResponse = { status: number; body: unknown };
type Account = { id: number; token: string };
type DatabaseModule = typeof import("../db");
type SchemaModule = typeof import("../db/schema");
type SessionStatus = "in_progress" | "completed" | "abandoned";

type Fixtures = {
  database: DatabaseModule;
  schema: SchemaModule;
  coachA: Account;
  coachB: Account;
  inviteCodeA: string;
  inviteCodeB: string;
  monthlyOfferId: number;
  offerOfCoachBId: number;
};

const PASSWORD = "smoketest-password";

// Field lists of the contract (docs/contracts/pt-clienti.md): nothing more, nothing less.
const CLIENT_KEYS = ["createdAt", "email", "id", "linkedAt", "name"];
const ROW_KEYS = [...CLIENT_KEYS, "last14Days", "lastSessionOn", "subscription"];
const SUBSCRIPTION_SUMMARY_KEYS = ["daysLeft", "paidThrough", "pausedUntil", "status"];
const FREQUENCY_KEYS = ["completedSessions", "expectedSessions"];
const SUBSCRIPTION_STATUSES = ["active", "expiring", "expired", "paused", "ended"];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_HOUR = 3_600_000;

// Expected dates are computed here, by hand, not with the code under test.
const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const romeWallClock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The instant of a Rome wall time: Rome is UTC+1 or UTC+2, the right offset reads back the same. */
const romeInstant = (romeDay: string, time: string): Date => {
  const asUtc = Date.parse(`${romeDay}T${time}:00Z`);
  const instant = [1, 2]
    .map((offsetHours) => new Date(asUtc - offsetHours * MS_PER_HOUR))
    .find((candidate) => romeWallClock.format(candidate) === `${romeDay} ${time}`);
  assert.ok(instant, `no Rome instant for ${romeDay} ${time}`);
  return instant;
};

const today = todayInRome();

const requireScratchDatabase = (): void => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";

  if (!databaseName || databaseName === "workout_planner") {
    throw new Error("Point DATABASE_URL at a scratch database for the e2e smoke.");
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

const asList = (value: unknown): JsonObject[] => {
  assert.ok(Array.isArray(value), `expected array, got ${JSON.stringify(value)}`);
  return value.map(asObject);
};

const failMessage = (response: ApiResponse): string =>
  `status ${response.status}: ${JSON.stringify(response.body)}`;

const assertStatus = (response: ApiResponse, status: number): void => {
  assert.equal(response.status, status, failMessage(response));
};

const assertKeys = (value: unknown, keys: string[]): void => {
  assert.deepEqual(Object.keys(asObject(value)).sort(), [...keys].sort());
};

const pickClientFields = (row: JsonObject): JsonObject =>
  Object.fromEntries(CLIENT_KEYS.map((key) => [key, row[key]]));

const uniqueSuffix = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toApiResponse = async (response: Response): Promise<ApiResponse> => {
  const text = await response.text();

  if (text.length === 0) {
    return { status: response.status, body: null };
  }

  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    return { status: response.status, body: text };
  }
};

/** A program body with `dayCount` empty days: only the number of days matters for the list. */
const programWithDays = (name: string, dayCount: number) => ({
  name,
  days: Array.from({ length: dayCount }, (_, index) => ({
    name: `Giorno ${index + 1}`,
    exercises: [],
  })),
});

describe("PT clients table smoke (R4)", { concurrency: false }, () => {
  let server: Server | undefined;
  let baseUrl = "";
  let fixtures: Fixtures | undefined;

  const setup = (): Fixtures => {
    assert.ok(fixtures, "fixtures are built in before()");
    return fixtures;
  };

  const api = async (
    method: string,
    path: string,
    options: { token?: string; mobile?: boolean; body?: unknown } = {},
  ): Promise<ApiResponse> => {
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
    return toApiResponse(response);
  };

  const register = async (
    label: string,
    isAthlete: boolean,
    name: string | null = `Clienti ${label}`,
  ): Promise<Account> => {
    const registered = await api("POST", "/api/auth/register", {
      mobile: isAthlete,
      body: {
        email: `clienti.${label}.${uniqueSuffix()}@example.com`,
        password: PASSWORD,
        ...(name === null ? {} : { name }),
      },
    });
    assertStatus(registered, 201);
    const payload = asObject(registered.body);
    const user = asObject(payload.user);
    assert.equal(user.role, isAthlete ? "athlete" : "coach");
    return { id: Number(user.id), token: String(payload.accessToken) };
  };

  const inviteCodeOf = async (coach: Account): Promise<string> => {
    const invite = await api("GET", "/api/coach/invite-code", { token: coach.token });
    assertStatus(invite, 200);
    return String(asObject(invite.body).code);
  };

  const linkToCoach = async (athlete: Account, inviteCode: string): Promise<void> => {
    const linked = await api("POST", "/api/athlete/coach/link", {
      token: athlete.token,
      mobile: true,
      body: { code: inviteCode },
    });
    assertStatus(linked, 201);
  };

  const newClient = async (
    label: string,
    inviteCode: string,
    name: string | null = `Clienti ${label}`,
  ): Promise<Account> => {
    const athlete = await register(label, true, name);
    await linkToCoach(athlete, inviteCode);
    return athlete;
  };

  const createOffer = async (coach: Account, body: JsonObject): Promise<JsonObject> => {
    const created = await api("POST", "/api/coach/offers", { token: coach.token, body });
    assertStatus(created, 201);
    return asObject(created.body);
  };

  const clientPath = (athlete: Account, rest: string): string =>
    `/api/coach/clients/${athlete.id}${rest}`;

  const createSubscription = async (
    coach: Account,
    athlete: Account,
    body: JsonObject,
  ): Promise<void> => {
    const created = await api("PUT", clientPath(athlete, "/subscription"), {
      token: coach.token,
      body,
    });
    assertStatus(created, 201);
  };

  const editSubscription = async (coach: Account, athlete: Account, body: JsonObject) => {
    const edited = await api("PUT", clientPath(athlete, "/subscription"), {
      token: coach.token,
      body,
    });
    assertStatus(edited, 200);
  };

  const readSubscriptionTab = async (coach: Account, athlete: Account): Promise<JsonObject> => {
    const read = await api("GET", clientPath(athlete, "/subscription"), { token: coach.token });
    assertStatus(read, 200);
    return asObject(read.body);
  };

  const listClients = async (coach: Account): Promise<JsonObject[]> => {
    const listed = await api("GET", "/api/coach/clients", { token: coach.token });
    assertStatus(listed, 200);
    return asList(listed.body);
  };

  const rowOf = async (coach: Account, athlete: Account): Promise<JsonObject> => {
    const row = (await listClients(coach)).find((client) => client.id === athlete.id);
    assert.ok(row, `client ${athlete.id} is in the list`);
    assertKeys(row, ROW_KEYS);
    return row;
  };

  const assign = async (
    coach: Account,
    athlete: Account,
    body: JsonObject,
  ): Promise<{ assignmentId: number; workoutId: number }> => {
    const assigned = await api("POST", "/api/coach/assignments", {
      token: coach.token,
      body: { athleteId: athlete.id, ...body },
    });
    assertStatus(assigned, 201);
    const payload = asObject(assigned.body);
    return {
      assignmentId: Number(asObject(payload.assignment).id),
      workoutId: Number(asObject(payload.workout).id),
    };
  };

  /**
   * The API stamps `completedAt` with the clock, so sessions on past days are written directly.
   * Same columns the session routes write; `completed_at` holds the UTC instant, as Drizzle does.
   */
  const insertSession = async (
    athlete: Account,
    workoutId: number,
    session: { status: SessionStatus; startedAt: Date; completedAt: Date | null },
  ): Promise<void> => {
    const { database, schema } = setup();
    await database.db.insert(schema.workoutSessions).values({
      workoutId,
      userId: athlete.id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    });
  };

  const insertCompletedSession = (athlete: Account, workoutId: number, completedAt: Date) =>
    insertSession(athlete, workoutId, {
      status: "completed",
      startedAt: new Date(completedAt.getTime() - MS_PER_HOUR),
      completedAt,
    });

  const personalWorkoutOf = async (athlete: Account): Promise<number> => {
    const created = await api("POST", "/api/workouts/program", {
      token: athlete.token,
      mobile: true,
      body: programWithDays("Scheda personale", 1),
    });
    assertStatus(created, 201);
    return Number(asObject(created.body).id);
  };

  before(async () => {
    requireScratchDatabase();

    const [{ app }, database, schema] = await Promise.all([
      import("../app"),
      import("../db"),
      import("../db/schema"),
    ]);

    server = app.listen(0);
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    const coachA = await register("coach-a", false);
    const coachB = await register("coach-b", false);
    const monthlyOffer = await createOffer(coachA, {
      name: "Coaching mensile",
      priceCents: 8000,
      periodUnit: "month",
      periodCount: 1,
    });
    const offerOfCoachB = await createOffer(coachB, {
      name: "Offerta coach B",
      priceCents: 9000,
      periodUnit: "month",
      periodCount: 1,
    });

    fixtures = {
      database,
      schema,
      coachA,
      coachB,
      inviteCodeA: await inviteCodeOf(coachA),
      inviteCodeB: await inviteCodeOf(coachB),
      monthlyOfferId: Number(monthlyOffer.id),
      offerOfCoachBId: Number(offerOfCoachB.id),
    };
  });

  after(async () => {
    if (server) {
      const httpServer = server;
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
        httpServer.closeAllConnections();
      });
    }

    if (fixtures) {
      await fixtures.database.closeDb();
    }
  });

  it("permissions: 401 without a token, 403 for an athlete", async () => {
    const { inviteCodeA } = setup();
    const athlete = await newClient("athlete-reads", inviteCodeA);

    assertStatus(await api("GET", "/api/coach/clients"), 401);
    assertStatus(await api("GET", "/api/coach/clients", { token: athlete.token, mobile: true }), 403);
  });

  it("a new client: no subscription, no session, no program; the five fields match the detail", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("bare", inviteCodeA);

    const row = await rowOf(coachA, client);
    assert.equal(row.subscription, null);
    assert.equal(row.lastSessionOn, null);
    assert.deepEqual(row.last14Days, { completedSessions: 0, expectedSessions: null });

    // The detail and analytics keep the five fields, and the list repeats them as they are.
    const detail = await api("GET", clientPath(client, ""), { token: coachA.token });
    assertStatus(detail, 200);
    const detailClient = asObject(asObject(detail.body).client);
    assertKeys(detailClient, CLIENT_KEYS);
    assert.deepEqual(pickClientFields(row), detailClient);

    const analytics = await api("GET", `/api/coach/analytics/clients/${client.id}`, {
      token: coachA.token,
    });
    assertStatus(analytics, 200);
    assertKeys(asObject(asObject(analytics.body).client), CLIENT_KEYS);
  });

  it("subscription: active, expiring, expired and ended read as on the subscription tab", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const startedOn = addDays(today, -40);

    const cases = [
      { label: "active", paidThrough: addDays(today, 20), status: "active", daysLeft: 20 },
      { label: "active-edge", paidThrough: addDays(today, 8), status: "active", daysLeft: 8 },
      { label: "expiring-edge", paidThrough: addDays(today, 7), status: "expiring", daysLeft: 7 },
      { label: "expiring-today", paidThrough: today, status: "expiring", daysLeft: 0 },
      { label: "expired", paidThrough: addDays(today, -1), status: "expired", daysLeft: -1 },
    ];

    const clients = await Promise.all(
      cases.map(async (expected) => {
        const client = await newClient(`subscription-${expected.label}`, inviteCodeA);
        await createSubscription(coachA, client, {
          offerId: monthlyOfferId,
          startedOn,
          paidThrough: expected.paidThrough,
        });
        return { client, expected };
      }),
    );

    const ended = await newClient("subscription-ended", inviteCodeA);
    await createSubscription(coachA, ended, {
      offerId: monthlyOfferId,
      startedOn,
      paidThrough: addDays(today, 10),
    });
    await editSubscription(coachA, ended, { endedOn: today });

    // An end date in the future does not end it yet (R2 rule).
    const endsLater = await newClient("subscription-ends-later", inviteCodeA);
    await createSubscription(coachA, endsLater, {
      offerId: monthlyOfferId,
      startedOn,
      paidThrough: addDays(today, 10),
    });
    await editSubscription(coachA, endsLater, { endedOn: addDays(today, 5) });

    const allCases = [
      ...clients,
      {
        client: ended,
        expected: { paidThrough: addDays(today, 10), status: "ended", daysLeft: 10 },
      },
      {
        client: endsLater,
        expected: { paidThrough: addDays(today, 10), status: "active", daysLeft: 10 },
      },
    ];

    const rows = await listClients(coachA);

    await Promise.all(
      allCases.map(async ({ client, expected }) => {
        const row = rows.find((candidate) => candidate.id === client.id);
        assert.ok(row, `client ${client.id} is in the list`);
        assertKeys(row.subscription, SUBSCRIPTION_SUMMARY_KEYS);
        assert.deepEqual(row.subscription, {
          status: expected.status,
          paidThrough: expected.paidThrough,
          daysLeft: expected.daysLeft,
          pausedUntil: null,
        });

        // Same values as the subscription tab for the same client on the same day.
        const tab = await readSubscriptionTab(coachA, client);
        assert.deepEqual(row.subscription, {
          ...asObject(tab.state),
          paidThrough: asObject(tab.subscription).paidThrough,
        });
      }),
    );
  });

  it("pause: a running pause reads paused with pausedUntil; a future, past or removed one does not", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const startedOn = addDays(today, -20);
    const paidThrough = addDays(today, 20);

    const subscribedClient = async (label: string): Promise<Account> => {
      const client = await newClient(label, inviteCodeA);
      await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn, paidThrough });
      return client;
    };

    const postPause = async (client: Account, startsOn: string, endsOn: string) => {
      const created = await api("POST", clientPath(client, "/pause"), {
        token: coachA.token,
        body: { startsOn, endsOn },
      });
      assertStatus(created, 201);
    };

    // Running: 8 days, from two days ago to five days ahead; the paid end moves by 8 days.
    const paused = await subscribedClient("pause-running");
    await postPause(paused, addDays(today, -2), addDays(today, 5));

    const future = await subscribedClient("pause-future");
    await postPause(future, addDays(today, 3), addDays(today, 6));

    const removed = await subscribedClient("pause-removed");
    await postPause(removed, addDays(today, 3), addDays(today, 6));
    assertStatus(await api("DELETE", clientPath(removed, "/pause"), { token: coachA.token }), 204);

    const past = await subscribedClient("pause-past");
    await postPause(past, addDays(today, -10), addDays(today, -1));

    const rows = await listClients(coachA);
    const subscriptionOf = (client: Account) =>
      rows.find((candidate) => candidate.id === client.id)?.subscription;

    assert.deepEqual(subscriptionOf(paused), {
      status: "paused",
      paidThrough: addDays(today, 28),
      daysLeft: 28,
      pausedUntil: addDays(today, 5),
    });
    assert.deepEqual(subscriptionOf(future), {
      status: "active",
      paidThrough: addDays(today, 24),
      daysLeft: 24,
      pausedUntil: null,
    });
    assert.deepEqual(subscriptionOf(removed), {
      status: "active",
      paidThrough,
      daysLeft: 20,
      pausedUntil: null,
    });
    assert.deepEqual(subscriptionOf(past), {
      status: "active",
      paidThrough: addDays(today, 30),
      daysLeft: 30,
      pausedUntil: null,
    });

    await Promise.all(
      [paused, future, removed, past].map(async (client) => {
        const tab = await readSubscriptionTab(coachA, client);
        assert.deepEqual(subscriptionOf(client), {
          ...asObject(tab.state),
          paidThrough: asObject(tab.subscription).paidThrough,
        });
      }),
    );
  });

  it("program: an active program with N days expects 2N; scheduled, expired or revoked expect nothing", async () => {
    const { coachA, inviteCodeA } = setup();

    const threeDays = await newClient("program-three-days", inviteCodeA);
    const threeDaysProgram = await assign(coachA, threeDays, {
      startsAt: addDays(today, -20),
      expiresAt: addDays(today, 10),
      program: programWithDays("Tre giorni", 3),
    });

    // A blank program has one day; starting and ending today is still active (bounds included).
    const blank = await newClient("program-blank", inviteCodeA);
    await assign(coachA, blank, { startsAt: today, expiresAt: today });

    const scheduled = await newClient("program-scheduled", inviteCodeA);
    await assign(coachA, scheduled, {
      startsAt: addDays(today, 1),
      expiresAt: addDays(today, 30),
      program: programWithDays("Programmata", 3),
    });

    const expired = await newClient("program-expired", inviteCodeA);
    await assign(coachA, expired, {
      startsAt: addDays(today, -30),
      expiresAt: addDays(today, -1),
      program: programWithDays("Scaduta", 3),
    });

    const revoked = await newClient("program-revoked", inviteCodeA);
    const revokedProgram = await assign(coachA, revoked, {
      startsAt: addDays(today, -5),
      expiresAt: addDays(today, 30),
      program: programWithDays("Revocata", 3),
    });
    assertStatus(
      await api("POST", `/api/coach/assignments/${revokedProgram.assignmentId}/revoke`, {
        token: coachA.token,
      }),
      200,
    );

    // A new program replaces the old one: the counts never add up.
    const replaced = await newClient("program-replaced", inviteCodeA);
    await assign(coachA, replaced, {
      startsAt: addDays(today, -10),
      expiresAt: addDays(today, 20),
      program: programWithDays("Vecchia", 3),
    });
    await assign(coachA, replaced, {
      startsAt: today,
      expiresAt: addDays(today, 20),
      program: programWithDays("Nuova", 2),
    });

    const rows = await listClients(coachA);
    const expectedOf = (client: Account) =>
      asObject(rows.find((candidate) => candidate.id === client.id)?.last14Days).expectedSessions;

    assert.equal(expectedOf(threeDays), 6);
    assert.equal(expectedOf(blank), 2);
    assert.equal(expectedOf(scheduled), null);
    assert.equal(expectedOf(expired), null);
    assert.equal(expectedOf(revoked), null);
    assert.equal(expectedOf(replaced), 4);

    // The list decides by the dates, not by the stored status, and never writes it back.
    const { database, schema } = setup();
    const storedStatus = async () => {
      const [row] = await database.db
        .select({ status: schema.programAssignments.status })
        .from(schema.programAssignments)
        .where(eq(schema.programAssignments.id, threeDaysProgram.assignmentId));
      return row?.status;
    };
    await database.db
      .update(schema.programAssignments)
      .set({ status: "scheduled" })
      .where(eq(schema.programAssignments.id, threeDaysProgram.assignmentId));

    const afterStale = await rowOf(coachA, threeDays);
    assert.equal(asObject(afterStale.last14Days).expectedSessions, 6);
    assert.equal(await storedStatus(), "scheduled", "GET /coach/clients does not sync statuses");
  });

  it("sessions: completed ones in the 14 Rome days count one by one; lastSessionOn is the Rome day", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("sessions", inviteCodeA);
    const { workoutId } = await assign(coachA, client, {
      startsAt: addDays(today, -30),
      expiresAt: addDays(today, 30),
      program: programWithDays("Due giorni", 2),
    });

    // Today through the real API: start on the first day (no weekday is planned) and close.
    const workout = await api("GET", `/api/workouts/${workoutId}`, {
      token: client.token,
      mobile: true,
    });
    assertStatus(workout, 200);
    const [firstDay] = asList(asObject(workout.body).days);
    const started = await api("POST", `/api/workouts/${workoutId}/sessions`, {
      token: client.token,
      mobile: true,
      body: { workoutDayId: firstDay?.id },
    });
    assertStatus(started, 201);
    const completed = await api("PATCH", `/api/sessions/${asObject(started.body).id}`, {
      token: client.token,
      mobile: true,
      body: { status: "completed", sets: [] },
    });
    assertStatus(completed, 200);

    // First day of the window just after Rome midnight: the UTC instant is still the day before.
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -13), "00:30"));
    // The day before the window, late in the evening: inside the wide UTC filter, outside the window.
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -14), "23:30"));
    // Two sessions on the same day count two.
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -5), "08:00"));
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -5), "19:00"));
    // Started before the window, completed inside: the completion day counts.
    await insertSession(client, workoutId, {
      status: "completed",
      startedAt: romeInstant(addDays(today, -20), "10:00"),
      completedAt: romeInstant(addDays(today, -3), "10:00"),
    });
    // Abandoned and in progress never count.
    await insertSession(client, workoutId, {
      status: "abandoned",
      startedAt: romeInstant(addDays(today, -2), "10:00"),
      completedAt: romeInstant(addDays(today, -2), "11:00"),
    });
    await insertSession(client, workoutId, {
      status: "in_progress",
      startedAt: romeInstant(addDays(today, -1), "10:00"),
      completedAt: null,
    });

    const row = await rowOf(coachA, client);
    assert.equal(row.lastSessionOn, today);
    assert.deepEqual(row.last14Days, { completedSessions: 5, expectedSessions: 4 });
  });

  it("sessions: lastSessionOn is the Rome day after midnight; an old session is outside the window", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("sessions-old", inviteCodeA);
    const workoutId = await personalWorkoutOf(client);

    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -40), "12:00"));
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -30), "00:30"));

    const row = await rowOf(coachA, client);
    assert.equal(row.lastSessionOn, addDays(today, -30));
    assert.deepEqual(row.last14Days, { completedSessions: 0, expectedSessions: null });
  });

  it("sessions: every session of the client counts, also on a personal program (D5)", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("sessions-personal", inviteCodeA);
    const workoutId = await personalWorkoutOf(client);

    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -1), "18:00"));
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -4), "18:00"));

    const row = await rowOf(coachA, client);
    assert.equal(row.lastSessionOn, addDays(today, -1));
    assert.deepEqual(row.last14Days, { completedSessions: 2, expectedSessions: null });
  });

  it("isolation: an ex client leaves the list; with a new coach the old subscription and program stay behind", async () => {
    const { coachA, coachB, inviteCodeA, inviteCodeB, monthlyOfferId, offerOfCoachBId } = setup();

    const moving = await newClient("moving", inviteCodeA);
    await createSubscription(coachA, moving, {
      offerId: monthlyOfferId,
      startedOn: addDays(today, -10),
      paidThrough: addDays(today, 20),
    });
    const { workoutId } = await assign(coachA, moving, {
      startsAt: addDays(today, -10),
      expiresAt: addDays(today, 20),
      program: programWithDays("Del coach A", 3),
    });
    await insertCompletedSession(moving, workoutId, romeInstant(addDays(today, -1), "18:00"));

    const beforeLeaving = await rowOf(coachA, moving);
    assert.equal(asObject(beforeLeaving.subscription).status, "active");
    assert.deepEqual(beforeLeaving.last14Days, { completedSessions: 1, expectedSessions: 6 });

    // The athlete leaves coach A and joins coach B.
    assertStatus(await api("DELETE", "/api/athlete/coach", { token: moving.token, mobile: true }), 200);
    assert.ok(
      (await listClients(coachA)).every((row) => row.id !== moving.id),
      "an ex client is not a row of the table",
    );
    await linkToCoach(moving, inviteCodeB);

    const withCoachB = await rowOf(coachB, moving);
    assert.equal(withCoachB.subscription, null, "coach A's subscription is not coach B's");
    assert.equal(withCoachB.lastSessionOn, addDays(today, -1));
    assert.deepEqual(withCoachB.last14Days, { completedSessions: 1, expectedSessions: null });
    assert.ok((await listClients(coachA)).every((row) => row.id !== moving.id));

    // Unlinked by the coach: gone too.
    const dropped = await newClient("dropped", inviteCodeA);
    await createSubscription(coachA, dropped, {
      offerId: monthlyOfferId,
      startedOn: addDays(today, -10),
      paidThrough: addDays(today, 20),
    });
    assertStatus(await api("DELETE", clientPath(dropped, ""), { token: coachA.token }), 200);
    assert.ok((await listClients(coachA)).every((row) => row.id !== dropped.id));

    // Coach B's own client: coach A sees nothing of it, coach B sees only its own rows.
    const ownOfB = await newClient("own-of-b", inviteCodeB);
    await createSubscription(coachB, ownOfB, {
      offerId: offerOfCoachBId,
      startedOn: addDays(today, -5),
      paidThrough: addDays(today, 3),
    });
    const rowsOfA = await listClients(coachA);
    const rowsOfB = await listClients(coachB);
    assert.ok(rowsOfA.every((row) => row.id !== ownOfB.id));
    assert.deepEqual(
      rowsOfB.map((row) => Number(row.id)).sort((left, right) => left - right),
      [moving.id, ownOfB.id].sort((left, right) => left - right),
    );
    assert.equal(asObject(rowsOfB.find((row) => row.id === ownOfB.id)?.subscription).status, "expiring");
  });

  it("order: rows keep the order by name, then email, with no name last", async () => {
    const coach = await register("coach-order", false);
    const inviteCode = await inviteCodeOf(coach);
    const zeta = await newClient("order-zeta", inviteCode, "Zeta");
    const noName = await newClient("order-no-name", inviteCode, null);
    const alfa = await newClient("order-alfa", inviteCode, "Alfa");
    const media = await newClient("order-media", inviteCode, "Media");

    const rows = await listClients(coach);
    assert.deepEqual(
      rows.map((row) => row.id),
      [alfa.id, media.id, zeta.id, noName.id],
    );
    assert.equal(rows[3]?.name, null);
  });

  it("shape: every row of the coach has exactly the contract fields and types", async () => {
    const { coachA } = setup();
    const rows = await listClients(coachA);
    assert.ok(rows.length > 10, "the earlier cases left rows to check");

    rows.forEach((row) => {
      assertKeys(row, ROW_KEYS);
      assert.equal(typeof row.id, "number");
      assert.equal(typeof row.email, "string");
      assert.ok(row.name === null || typeof row.name === "string");
      assert.ok(!Number.isNaN(Date.parse(String(row.createdAt))));
      assert.ok(!Number.isNaN(Date.parse(String(row.linkedAt))));
      assert.ok(row.lastSessionOn === null || DATE_KEY.test(String(row.lastSessionOn)));

      const frequency = asObject(row.last14Days);
      assertKeys(frequency, FREQUENCY_KEYS);
      assert.ok(Number.isInteger(frequency.completedSessions));
      assert.ok(Number(frequency.completedSessions) >= 0);
      assert.ok(
        frequency.expectedSessions === null ||
          (Number.isInteger(frequency.expectedSessions) && Number(frequency.expectedSessions) >= 2),
      );

      if (row.subscription === null) {
        return;
      }

      const subscription = asObject(row.subscription);
      assertKeys(subscription, SUBSCRIPTION_SUMMARY_KEYS);
      assert.ok(SUBSCRIPTION_STATUSES.includes(String(subscription.status)));
      assert.ok(DATE_KEY.test(String(subscription.paidThrough)));
      assert.ok(Number.isInteger(subscription.daysLeft));
      assert.equal(
        subscription.pausedUntil !== null,
        subscription.status === "paused",
        "pausedUntil only with paused",
      );
    });
  });
});

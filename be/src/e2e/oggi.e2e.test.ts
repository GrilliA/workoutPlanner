import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;
type ApiResponse = { status: number; body: unknown };
type Account = { id: number; token: string };
type DatabaseModule = typeof import("../db");
type SchemaModule = typeof import("../db/schema");

type Fixtures = {
  database: DatabaseModule;
  schema: SchemaModule;
};

/** A coach of one test, with an offer to create subscriptions. */
type CoachSetup = { coach: Account; inviteCode: string; offerId: number };

const PASSWORD = "smoketest-password";

// Field lists of the contract (docs/contracts/pt-oggi.md): nothing more, nothing less.
const TODAY_KEYS = ["clientCount", "handledCount", "items", "recentActivity"];
const ITEM_KEYS = [
  "alerts",
  "athleteEmail",
  "athleteId",
  "athleteName",
  "risk",
  "severity",
  "subscription",
];
const RISK_KEYS = ["level", "reasons"];
const REASON_KEYS = ["kind", "message"];
const RISK_REASON_KINDS = [
  "subscription_expiring",
  "subscription_expired",
  "low_frequency",
  "no_recent_session",
];

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

const assertError = (response: ApiResponse, status: number, error: string): void => {
  assertStatus(response, status);
  assert.deepEqual(response.body, { error });
};

const assertKeys = (value: unknown, keys: string[]): void => {
  assert.deepEqual(Object.keys(asObject(value)).sort(), [...keys].sort());
};

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

/** A program body with `dayCount` empty days: exercises are written directly when a test needs them. */
const programWithDays = (name: string, dayCount: number) => ({
  name,
  days: Array.from({ length: dayCount }, (_, index) => ({
    name: `Giorno ${index + 1}`,
    exercises: [],
  })),
});

/** The risk and alert part of a row; the subscription is checked apart. */
const reasonsOf = (item: JsonObject | undefined) => ({
  severity: item?.severity,
  risk: item?.risk,
  alerts: item?.alerts,
});

describe("PT Today inbox smoke (R5)", { concurrency: false }, () => {
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

  const sendRawBody = async (path: string, rawBody: string, token: string): Promise<ApiResponse> => {
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });
    const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: rawBody });
    return toApiResponse(response);
  };

  const register = async (
    label: string,
    isAthlete: boolean,
    name: string | null = `Oggi ${label}`,
  ): Promise<Account> => {
    const registered = await api("POST", "/api/auth/register", {
      mobile: isAthlete,
      body: {
        email: `oggi.${label}.${uniqueSuffix()}@example.com`,
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

  /** Every test that counts or orders rows has its own coach, so earlier tests add no rows. */
  const newCoach = async (label: string): Promise<CoachSetup> => {
    const coach = await register(label, false);
    const offer = await api("POST", "/api/coach/offers", {
      token: coach.token,
      body: { name: "Coaching mensile", priceCents: 8000, periodUnit: "month", periodCount: 1 },
    });
    assertStatus(offer, 201);
    return {
      coach,
      inviteCode: await inviteCodeOf(coach),
      offerId: Number(asObject(offer.body).id),
    };
  };

  const newClient = async (
    label: string,
    coachSetup: CoachSetup,
    name: string | null = `Oggi ${label}`,
  ): Promise<Account> => {
    const athlete = await register(label, true, name);
    await linkToCoach(athlete, coachSetup.inviteCode);
    return athlete;
  };

  const clientPath = (athlete: Account, rest: string): string =>
    `/api/coach/clients/${athlete.id}${rest}`;

  const handledPath = (athleteId: number | string): string =>
    `/api/coach/today/${athleteId}/handled`;

  const createSubscription = async (
    coachSetup: CoachSetup,
    athlete: Account,
    dates: { startedOn: string; paidThrough: string },
  ): Promise<void> => {
    const created = await api("PUT", clientPath(athlete, "/subscription"), {
      token: coachSetup.coach.token,
      body: { offerId: coachSetup.offerId, ...dates },
    });
    assertStatus(created, 201);
  };

  const assign = async (
    coachSetup: CoachSetup,
    athlete: Account,
    body: JsonObject,
  ): Promise<number> => {
    const assigned = await api("POST", "/api/coach/assignments", {
      token: coachSetup.coach.token,
      body: { athleteId: athlete.id, ...body },
    });
    assertStatus(assigned, 201);
    return Number(asObject(asObject(assigned.body).workout).id);
  };

  const personalWorkoutOf = async (athlete: Account): Promise<number> => {
    const created = await api("POST", "/api/workouts/program", {
      token: athlete.token,
      mobile: true,
      body: programWithDays("Scheda personale", 1),
    });
    assertStatus(created, 201);
    return Number(asObject(created.body).id);
  };

  const readToday = async (coach: Account): Promise<JsonObject> => {
    const read = await api("GET", "/api/coach/today", { token: coach.token });
    assertStatus(read, 200);
    assertKeys(read.body, TODAY_KEYS);
    const body = asObject(read.body);
    asList(body.items).forEach((item) => assertKeys(item, ITEM_KEYS));
    return body;
  };

  const itemsOf = async (coach: Account): Promise<JsonObject[]> =>
    asList((await readToday(coach)).items);

  const itemOf = (items: JsonObject[], athlete: Account): JsonObject | undefined =>
    items.find((item) => item.athleteId === athlete.id);

  const listClients = async (coach: Account): Promise<JsonObject[]> => {
    const listed = await api("GET", "/api/coach/clients", { token: coach.token });
    assertStatus(listed, 200);
    return asList(listed.body);
  };

  const markHandled = async (coach: Account, athlete: Account): Promise<void> => {
    assertStatus(await api("POST", handledPath(athlete.id), { token: coach.token }), 204);
  };

  const unmarkHandled = async (coach: Account, athlete: Account): Promise<void> => {
    assertStatus(await api("DELETE", handledPath(athlete.id), { token: coach.token }), 204);
  };

  /**
   * The API stamps `completedAt` with the clock, so sessions on past days are written directly.
   * Same columns the session routes write; `completed_at` holds the UTC instant, as Drizzle does.
   */
  const insertCompletedSession = async (
    athlete: Account,
    workoutId: number,
    completedAt: Date,
  ): Promise<number> => {
    const { database, schema } = setup();
    const [session] = await database.db
      .insert(schema.workoutSessions)
      .values({
        workoutId,
        userId: athlete.id,
        status: "completed",
        startedAt: new Date(completedAt.getTime() - MS_PER_HOUR),
        completedAt,
      })
      .returning({ id: schema.workoutSessions.id });
    assert.ok(session);
    return session.id;
  };

  const insertExercise = async (
    workoutId: number,
    exercise: { name: string; catalogId: string | null },
  ): Promise<number> => {
    const { database, schema } = setup();
    const [row] = await database.db
      .insert(schema.exercises)
      .values({ workoutId, name: exercise.name, catalogId: exercise.catalogId })
      .returning({ id: schema.exercises.id });
    assert.ok(row);
    return row.id;
  };

  /** Logged sets of one exercise in one session: `[weightKg, reps]` per set. */
  const insertSets = async (
    sessionId: number,
    exerciseId: number,
    sets: [number | null, number][],
  ): Promise<void> => {
    const { database, schema } = setup();
    await database.db.insert(schema.loggedSets).values(
      sets.map(([weightKg, reps], index) => ({
        sessionId,
        exerciseId,
        setNumber: index + 1,
        weightKg,
        reps,
      })),
    );
  };

  /** Only the day matters: the link is the start of "no session since they became a client". */
  const setLinkedOn = async (coach: Account, athlete: Account, day: string): Promise<void> => {
    const { database, schema } = setup();
    await database.db
      .update(schema.coachAthletes)
      .set({ createdAt: romeInstant(day, "12:00") })
      .where(
        and(
          eq(schema.coachAthletes.coachId, coach.id),
          eq(schema.coachAthletes.athleteId, athlete.id),
        ),
      );
  };

  const isOfPair = (coach: Account, athlete: Account) => {
    const { schema } = setup();
    return and(
      eq(schema.coachInboxHandled.coachId, coach.id),
      eq(schema.coachInboxHandled.athleteId, athlete.id),
    );
  };

  const storedHandled = async (coach: Account, athlete: Account) => {
    const { database, schema } = setup();
    const [row] = await database.db
      .select({
        handledAt: schema.coachInboxHandled.handledAt,
        severityAtHandle: schema.coachInboxHandled.severityAtHandle,
      })
      .from(schema.coachInboxHandled)
      .where(isOfPair(coach, athlete));
    return row ?? null;
  };

  const setHandledAt = async (coach: Account, athlete: Account, handledAt: Date): Promise<void> => {
    const { database, schema } = setup();
    await database.db
      .update(schema.coachInboxHandled)
      .set({ handledAt })
      .where(isOfPair(coach, athlete));
  };

  /** A client with an expired subscription who trained yesterday: one medium row. */
  const unpaidClient = async (label: string, coachSetup: CoachSetup): Promise<Account> => {
    const client = await newClient(label, coachSetup);
    await createSubscription(coachSetup, client, {
      startedOn: addDays(today, -40),
      paidThrough: addDays(today, -2),
    });
    const workoutId = await personalWorkoutOf(client);
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -1), "18:00"));
    return client;
  };

  /** Paid well ahead and trained yesterday: nothing to report. */
  const quietClient = async (label: string, coachSetup: CoachSetup): Promise<Account> => {
    const client = await newClient(label, coachSetup);
    await createSubscription(coachSetup, client, {
      startedOn: addDays(today, -20),
      paidThrough: addDays(today, 40),
    });
    const workoutId = await personalWorkoutOf(client);
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -1), "18:00"));
    return client;
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

    fixtures = { database, schema };
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

  it("permissions: 401 without a token, 403 for an athlete, on the three routes", async () => {
    const coachSetup = await newCoach("coach-permissions");
    const athlete = await newClient("athlete-permissions", coachSetup);

    assertStatus(await api("GET", "/api/coach/today"), 401);
    assertStatus(await api("POST", handledPath(athlete.id)), 401);
    assertStatus(await api("DELETE", handledPath(athlete.id)), 401);

    const asAthlete = { token: athlete.token, mobile: true };
    assertStatus(await api("GET", "/api/coach/today", asAthlete), 403);
    assertStatus(await api("POST", handledPath(athlete.id), asAthlete), 403);
    assertStatus(await api("DELETE", handledPath(athlete.id), asAthlete), 403);
  });

  it("empty: a coach without clients reads zeros and no rows", async () => {
    const { coach } = await newCoach("coach-empty");

    assert.deepEqual(await readToday(coach), {
      clientCount: 0,
      handledCount: 0,
      items: [],
      recentActivity: [],
    });
  });

  it("rows: severity, reasons and order; paused and quiet clients have no row; the feed is the dashboard's", async () => {
    const coachSetup = await newCoach("coach-rows");
    const { coach } = coachSetup;

    // Expiring in 3 days and 2 sessions out of 6: high.
    const high = await newClient("high", coachSetup, "Bianca Alta");
    await createSubscription(coachSetup, high, {
      startedOn: addDays(today, -40),
      paidThrough: addDays(today, 3),
    });
    const highWorkoutId = await assign(coachSetup, high, {
      startsAt: addDays(today, -20),
      expiresAt: addDays(today, 30),
      program: programWithDays("Tre giorni", 3),
    });
    await insertCompletedSession(high, highWorkoutId, romeInstant(addDays(today, -1), "18:00"));
    await insertCompletedSession(high, highWorkoutId, romeInstant(addDays(today, -3), "18:00"));

    // Expired 4 days ago, training regularly: medium, first of the medium rows.
    const expired = await newClient("expired", coachSetup, "Elena Scaduta");
    await createSubscription(coachSetup, expired, {
      startedOn: addDays(today, -40),
      paidThrough: addDays(today, -4),
    });
    const expiredWorkoutId = await personalWorkoutOf(expired);
    await insertCompletedSession(expired, expiredWorkoutId, romeInstant(addDays(today, -1), "18:00"));

    // Never trained, linked 9 days ago: medium, no name.
    const neverTrained = await newClient("never", coachSetup, null);
    await setLinkedOn(coach, neverTrained, addDays(today, -9));

    // Only the program ends in 5 days: medium without risk.
    const programEnding = await newClient("program", coachSetup, "Paolo Programma");
    const programWorkoutId = await assign(coachSetup, programEnding, {
      startsAt: addDays(today, -20),
      expiresAt: addDays(today, 5),
      program: programWithDays("Un giorno", 1),
    });
    await insertCompletedSession(programEnding, programWorkoutId, romeInstant(addDays(today, -1), "18:00"));
    await insertCompletedSession(programEnding, programWorkoutId, romeInstant(addDays(today, -2), "18:00"));

    // Paused and inactive for a month: no row, no risk.
    const paused = await newClient("paused", coachSetup, "Pia Pausa");
    await createSubscription(coachSetup, paused, {
      startedOn: addDays(today, -20),
      paidThrough: addDays(today, 20),
    });
    const pause = await api("POST", clientPath(paused, "/pause"), {
      token: coach.token,
      body: { startsOn: addDays(today, -2), endsOn: addDays(today, 5) },
    });
    assertStatus(pause, 201);
    await setLinkedOn(coach, paused, addDays(today, -30));

    const quiet = await quietClient("quiet", coachSetup);

    // A personal record yesterday: low.
    const recordHolder = await newClient("record", coachSetup, "Rita Record");
    await createSubscription(coachSetup, recordHolder, {
      startedOn: addDays(today, -20),
      paidThrough: addDays(today, 40),
    });
    const recordWorkoutId = await personalWorkoutOf(recordHolder);
    const squatId = await insertExercise(recordWorkoutId, { name: "Squat", catalogId: null });
    const firstSquat = await insertCompletedSession(
      recordHolder,
      recordWorkoutId,
      romeInstant(addDays(today, -20), "18:00"),
    );
    await insertSets(firstSquat, squatId, [[100, 5]]);
    const betterSquat = await insertCompletedSession(
      recordHolder,
      recordWorkoutId,
      romeInstant(addDays(today, -1), "18:00"),
    );
    await insertSets(betterSquat, squatId, [[110, 5]]);

    const todayRead = await readToday(coach);
    const items = asList(todayRead.items);

    assert.equal(todayRead.clientCount, 7);
    assert.equal(todayRead.handledCount, 0);
    assert.deepEqual(
      items.map((item) => item.athleteId),
      [high.id, expired.id, neverTrained.id, programEnding.id, recordHolder.id],
    );

    assert.deepEqual(reasonsOf(itemOf(items, high)), {
      severity: "high",
      risk: {
        level: "high",
        reasons: [
          { kind: "subscription_expiring", message: "Abbonamento in scadenza tra 3 giorni" },
          { kind: "low_frequency", message: "2 sessioni su 6 negli ultimi 14 giorni" },
        ],
      },
      alerts: [],
    });
    assert.deepEqual(itemOf(items, high)?.subscription, {
      status: "expiring",
      paidThrough: addDays(today, 3),
      daysLeft: 3,
      pausedUntil: null,
    });
    assert.equal(itemOf(items, high)?.athleteName, "Bianca Alta");
    assert.equal(typeof itemOf(items, high)?.athleteEmail, "string");

    assert.deepEqual(reasonsOf(itemOf(items, expired)), {
      severity: "medium",
      risk: {
        level: "medium",
        reasons: [{ kind: "subscription_expired", message: "Abbonamento scaduto da 4 giorni" }],
      },
      alerts: [],
    });

    assert.deepEqual(reasonsOf(itemOf(items, neverTrained)), {
      severity: "medium",
      risk: {
        level: "medium",
        reasons: [
          { kind: "no_recent_session", message: "Nessuna sessione da quando è cliente (9 giorni)" },
        ],
      },
      alerts: [],
    });
    assert.equal(itemOf(items, neverTrained)?.athleteName, null);
    assert.equal(itemOf(items, neverTrained)?.subscription, null);

    assert.deepEqual(reasonsOf(itemOf(items, programEnding)), {
      severity: "medium",
      risk: null,
      alerts: [{ kind: "program_expiring", message: "Scheda in scadenza tra 5 giorni" }],
    });

    assert.deepEqual(reasonsOf(itemOf(items, recordHolder)), {
      severity: "low",
      risk: null,
      alerts: [{ kind: "personal_records", message: "Nuovo record: Squat" }],
    });

    assert.equal(itemOf(items, paused), undefined, "a paused client has no row");
    assert.equal(itemOf(items, quiet), undefined, "nothing to report, no row");

    // Same risk on the clients table, for every client, the paused one included (null).
    const rows = await listClients(coach);
    assert.equal(rows.length, 7);
    rows.forEach((row) => {
      const item = items.find((candidate) => candidate.athleteId === row.id);
      assert.deepEqual(row.risk, item?.risk ?? null, `risk of client ${String(row.id)}`);
    });

    // The feed is the one of the dashboard, which stays as it is.
    const dashboard = await api("GET", "/api/coach/dashboard", { token: coach.token });
    assertStatus(dashboard, 200);
    assert.deepEqual(todayRead.recentActivity, asObject(dashboard.body).recentActivity);
    assert.ok(asList(todayRead.recentActivity).length > 0);
  });

  it("ex clients: unlinked by the coach or gone to another coach, they have no row", async () => {
    const coachSetup = await newCoach("coach-ex");
    const otherCoach = await newCoach("coach-ex-other");
    const unlinked = await unpaidClient("ex-unlinked", coachSetup);
    const leaving = await unpaidClient("ex-leaving", coachSetup);

    const beforeLeaving = await itemsOf(coachSetup.coach);
    assert.ok(itemOf(beforeLeaving, unlinked));
    assert.ok(itemOf(beforeLeaving, leaving));

    assertStatus(await api("DELETE", clientPath(unlinked, ""), { token: coachSetup.coach.token }), 200);
    assertStatus(await api("DELETE", "/api/athlete/coach", { token: leaving.token, mobile: true }), 200);
    await linkToCoach(leaving, otherCoach.inviteCode);

    const afterLeaving = await readToday(coachSetup.coach);
    assert.equal(afterLeaving.clientCount, 0);
    assert.deepEqual(afterLeaving.items, []);
  });

  it("records: the first appearance is not a record; catalog id and name follow the exercise across programs", async () => {
    const coachSetup = await newCoach("coach-records");
    const otherCoach = await newCoach("coach-records-other");
    const { database, schema } = setup();
    const [catalogEntry] = await database.db
      .insert(schema.exerciseCatalog)
      .values({ id: `e2e-oggi-bench-${uniqueSuffix()}`, name: "Bench press" })
      .returning({ id: schema.exerciseCatalog.id });
    assert.ok(catalogEntry);

    // Two programs: every assignment copies the exercises with new ids.
    const client = await newClient("records", coachSetup, "Remo Record");
    const oldWorkoutId = await assign(coachSetup, client, {
      startsAt: addDays(today, -40),
      expiresAt: addDays(today, -10),
      program: programWithDays("Vecchia", 1),
    });
    const newWorkoutId = await assign(coachSetup, client, {
      startsAt: addDays(today, -9),
      expiresAt: addDays(today, 30),
      program: programWithDays("Nuova", 1),
    });
    const oldBench = await insertExercise(oldWorkoutId, { name: "Panca piana", catalogId: catalogEntry.id });
    const oldRow = await insertExercise(oldWorkoutId, { name: "Rematore Bilanciere ", catalogId: null });
    const newBench = await insertExercise(newWorkoutId, { name: "Panca piana B", catalogId: catalogEntry.id });
    const newRow = await insertExercise(newWorkoutId, { name: "rematore bilanciere", catalogId: null });
    const firstPress = await insertExercise(newWorkoutId, { name: "Military press", catalogId: null });

    const oldSession = await insertCompletedSession(client, oldWorkoutId, romeInstant(addDays(today, -20), "18:00"));
    await insertSets(oldSession, oldBench, [[100, 5]]);
    await insertSets(oldSession, oldRow, [[60, 8]]);
    const newSession = await insertCompletedSession(client, newWorkoutId, romeInstant(addDays(today, -1), "18:00"));
    // 105 × 5 is the best of the session; 0 kg, no weight and 13 reps never count.
    await insertSets(newSession, newBench, [[90, 8], [105, 5], [0, 5], [null, 5]]);
    await insertSets(newSession, newRow, [[62.5, 8], [200, 13]]);
    await insertSets(newSession, firstPress, [[50, 5]]);

    // Only one session, so a first appearance: no record, and nothing else to report.
    const firstTimer = await newClient("records-first", coachSetup, "Franco Primo");
    const firstWorkoutId = await personalWorkoutOf(firstTimer);
    const firstExercise = await insertExercise(firstWorkoutId, { name: "Squat", catalogId: null });
    const firstSession = await insertCompletedSession(firstTimer, firstWorkoutId, romeInstant(addDays(today, -1), "18:00"));
    await insertSets(firstSession, firstExercise, [[100, 5]]);

    // The record was 8 days ago, outside the week; yesterday was not better.
    const oldRecord = await newClient("records-old", coachSetup, "Olga Vecchia");
    const oldRecordWorkoutId = await personalWorkoutOf(oldRecord);
    const oldRecordExercise = await insertExercise(oldRecordWorkoutId, { name: "Stacco", catalogId: null });
    const recordDays: [number, number][] = [
      [-30, 100],
      [-8, 110],
      [-1, 105],
    ];
    for (const [daysAgo, weightKg] of recordDays) {
      const sessionId = await insertCompletedSession(
        oldRecord,
        oldRecordWorkoutId,
        romeInstant(addDays(today, daysAgo), "18:00"),
      );
      await insertSets(sessionId, oldRecordExercise, [[weightKg, 5]]);
    }

    const items = await itemsOf(coachSetup.coach);
    assert.deepEqual(reasonsOf(itemOf(items, client)), {
      severity: "low",
      risk: null,
      alerts: [{ kind: "personal_records", message: "Nuovi record: Panca piana B, rematore bilanciere" }],
    });
    assert.equal(itemOf(items, firstTimer), undefined, "a first appearance is not a record");
    assert.equal(itemOf(items, oldRecord), undefined, "a record before the week does not count");

    // Another coach never reads these sets.
    assert.deepEqual((await readToday(otherCoach.coach)).items, []);
  });

  it("handled: hides the row, a worse row comes back, marking again hides it, DELETE restores it", async () => {
    const coachSetup = await newCoach("coach-handled");
    const { coach } = coachSetup;
    const client = await unpaidClient("handled", coachSetup);
    const other = await unpaidClient("handled-other", coachSetup);

    assert.equal(itemOf(await itemsOf(coach), client)?.severity, "medium");
    await markHandled(coach, client);

    const afterMark = await readToday(coach);
    assert.equal(itemOf(asList(afterMark.items), client), undefined);
    assert.ok(itemOf(asList(afterMark.items), other));
    assert.equal(afterMark.handledCount, 1);
    assert.equal((await storedHandled(coach, client))?.severityAtHandle, "medium");

    // "Gestito" does not touch the clients table.
    const listed = (await listClients(coach)).find((row) => row.id === client.id);
    assert.equal(asObject(listed?.risk).level, "medium");

    // A program of 3 days with 1 session out of 6: now high, so the row comes back.
    await assign(coachSetup, client, {
      startsAt: addDays(today, -20),
      expiresAt: addDays(today, 30),
      program: programWithDays("Tre giorni", 3),
    });
    const afterWorse = await readToday(coach);
    assert.equal(itemOf(asList(afterWorse.items), client)?.severity, "high");
    assert.equal(afterWorse.handledCount, 0);

    // Marking again stores the severity computed now; a severity in the body is ignored.
    const marked = await api("POST", handledPath(client.id), {
      token: coach.token,
      body: { severityAtHandle: "low" },
    });
    assertStatus(marked, 204);
    assert.equal(marked.body, null);
    assert.equal((await storedHandled(coach, client))?.severityAtHandle, "high");
    const afterSecondMark = await readToday(coach);
    assert.equal(itemOf(asList(afterSecondMark.items), client), undefined);
    assert.equal(afterSecondMark.handledCount, 1);

    // Undo, twice: the second finds nothing and is still 204.
    await unmarkHandled(coach, client);
    await unmarkHandled(coach, client);
    assert.equal(await storedHandled(coach, client), null);
    const afterUndo = await readToday(coach);
    assert.ok(itemOf(asList(afterUndo.items), client));
    assert.equal(afterUndo.handledCount, 0);
  });

  it("handled: hidden for 7 Rome days from the day it was marked", async () => {
    const coachSetup = await newCoach("coach-handled-days");
    const { coach } = coachSetup;
    const client = await unpaidClient("handled-days", coachSetup);
    await markHandled(coach, client);

    // Just after midnight in Rome six days ago: still the sixth day, hidden.
    await setHandledAt(coach, client, romeInstant(addDays(today, -6), "00:30"));
    assert.equal(itemOf(await itemsOf(coach), client), undefined);

    // Late in the evening seven days ago: the seventh day, back.
    await setHandledAt(coach, client, romeInstant(addDays(today, -7), "23:30"));
    const afterWeek = await readToday(coach);
    assert.ok(itemOf(asList(afterWeek.items), client));
    assert.equal(afterWeek.handledCount, 0);
  });

  it("handled: a client with nothing to report, or paused, gets 204 and nothing is written", async () => {
    const coachSetup = await newCoach("coach-handled-nothing");
    const { coach } = coachSetup;
    const quiet = await quietClient("handled-quiet", coachSetup);

    // Inactive for a month, which alone would be a row, but paused.
    const paused = await newClient("handled-paused", coachSetup);
    await createSubscription(coachSetup, paused, {
      startedOn: addDays(today, -20),
      paidThrough: addDays(today, 20),
    });
    const pause = await api("POST", clientPath(paused, "/pause"), {
      token: coach.token,
      body: { startsOn: addDays(today, -2), endsOn: addDays(today, 5) },
    });
    assertStatus(pause, 201);
    await setLinkedOn(coach, paused, addDays(today, -30));

    await markHandled(coach, quiet);
    await markHandled(coach, paused);

    assert.equal(await storedHandled(coach, quiet), null);
    assert.equal(await storedHandled(coach, paused), null);
    assert.equal((await readToday(coach)).handledCount, 0);
  });

  it("errors: 400 for a bad id or a malformed body, 404 for another coach's or an unknown athlete, nothing written", async () => {
    const coachSetup = await newCoach("coach-errors");
    const otherCoach = await newCoach("coach-errors-other");
    const { coach } = coachSetup;
    const ownClient = await unpaidClient("errors-own", coachSetup);
    const clientOfOther = await unpaidClient("errors-of-other", otherCoach);
    await markHandled(otherCoach.coach, clientOfOther);

    await Promise.all(
      ["POST", "DELETE"].map(async (method) => {
        const asCoach = { token: coach.token };
        assertError(await api(method, handledPath("abc"), asCoach), 400, "Invalid athlete id");
        assertError(await api(method, handledPath(0), asCoach), 400, "Invalid athlete id");
        assertError(await api(method, handledPath("1.5"), asCoach), 400, "Invalid athlete id");
        assertError(await api(method, handledPath(clientOfOther.id), asCoach), 404, "Client not found");
        assertError(await api(method, handledPath(2_000_000_000), asCoach), 404, "Client not found");
      }),
    );

    // The global body parser refuses a malformed body before the route runs.
    assertError(
      await sendRawBody(handledPath(ownClient.id), '{"severityAtHandle": ', coach.token),
      400,
      "Invalid request body",
    );

    assert.equal(await storedHandled(coach, clientOfOther), null);
    assert.equal(await storedHandled(coach, ownClient), null);
    assert.equal(
      (await storedHandled(otherCoach.coach, clientOfOther))?.severityAtHandle,
      "medium",
      "another coach's DELETE does not touch this coach's handled row",
    );
  });

  it("unlink: unlinking or leaving deletes the handled row; a relinked client starts clean", async () => {
    const coachSetup = await newCoach("coach-unlink");
    const { coach } = coachSetup;
    const unlinked = await unpaidClient("unlink-coach", coachSetup);
    const leaving = await unpaidClient("unlink-athlete", coachSetup);
    await markHandled(coach, unlinked);
    await markHandled(coach, leaving);
    assert.ok(await storedHandled(coach, unlinked));
    assert.ok(await storedHandled(coach, leaving));

    assertStatus(await api("DELETE", clientPath(unlinked, ""), { token: coach.token }), 200);
    assertStatus(await api("DELETE", "/api/athlete/coach", { token: leaving.token, mobile: true }), 200);

    assert.equal(await storedHandled(coach, unlinked), null);
    assert.equal(await storedHandled(coach, leaving), null);

    // Back with the same coach within the week: no handled row came back with the link.
    await linkToCoach(leaving, coachSetup.inviteCode);
    assert.equal(await storedHandled(coach, leaving), null);
    const relinked = await readToday(coach);
    assert.equal(relinked.handledCount, 0);
    assert.equal(relinked.clientCount, 1);
  });

  it("shape: risk on every row of the clients table is null or a level with reasons", async () => {
    const coachSetup = await newCoach("coach-shape");
    await unpaidClient("shape-unpaid", coachSetup);
    await quietClient("shape-quiet", coachSetup);
    const neverTrained = await newClient("shape-never", coachSetup);
    await setLinkedOn(coachSetup.coach, neverTrained, addDays(today, -10));

    const rows = await listClients(coachSetup.coach);
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((row) => row.risk !== null).length, 2);

    rows.forEach((row) => {
      if (row.risk === null) {
        return;
      }

      assertKeys(row.risk, RISK_KEYS);
      const risk = asObject(row.risk);
      assert.ok(risk.level === "high" || risk.level === "medium");
      const reasons = asList(risk.reasons);
      assert.ok(reasons.length > 0);
      reasons.forEach((reason) => {
        assertKeys(reason, REASON_KEYS);
        assert.ok(RISK_REASON_KINDS.includes(String(reason.kind)));
        assert.equal(typeof reason.message, "string");
      });
    });
  });

  it("program_expiring: only this coach's active program; a revoked one or a previous coach's gives no row", async () => {
    const coachSetup = await newCoach("coach-program-scope");
    const nextCoach = await newCoach("coach-program-scope-next");
    const { coach } = coachSetup;
    const programEndingIn3Days = {
      startsAt: addDays(today, -10),
      expiresAt: addDays(today, 3),
      program: programWithDays("Un giorno", 1),
    };
    const expiringAlert = [{ kind: "program_expiring", message: "Scheda in scadenza tra 3 giorni" }];

    // Paid ahead and trained yesterday: the program is the only reason.
    const revokedClient = await quietClient("program-revoked", coachSetup);
    const assigned = await api("POST", "/api/coach/assignments", {
      token: coach.token,
      body: { athleteId: revokedClient.id, ...programEndingIn3Days },
    });
    assertStatus(assigned, 201);
    const assignmentId = Number(asObject(asObject(assigned.body).assignment).id);
    const mover = await quietClient("program-mover", coachSetup);
    await assign(coachSetup, mover, programEndingIn3Days);

    const beforeChanges = await itemsOf(coach);
    assert.deepEqual(itemOf(beforeChanges, revokedClient)?.alerts, expiringAlert);
    assert.deepEqual(itemOf(beforeChanges, mover)?.alerts, expiringAlert);

    assertStatus(await api("POST", `/api/coach/assignments/${assignmentId}/revoke`, { token: coach.token }), 200);
    assert.equal(itemOf(await itemsOf(coach), revokedClient), undefined, "a revoked program does not expire");

    // The program of the previous coach is still active by its dates, but not the new coach's.
    assertStatus(await api("DELETE", "/api/athlete/coach", { token: mover.token, mobile: true }), 200);
    await linkToCoach(mover, nextCoach.inviteCode);
    const nextCoachToday = await readToday(nextCoach.coach);
    assert.equal(nextCoachToday.clientCount, 1);
    assert.deepEqual(nextCoachToday.items, []);
  });

  it("ended subscription: no subscription reason, sorted after the due ones; unknown query params are ignored", async () => {
    const coachSetup = await newCoach("coach-ended");
    const { coach } = coachSetup;
    // Expired 2 days ago, trained yesterday: medium, 1 day without a session.
    const unpaid = await unpaidClient("ended-unpaid", coachSetup);
    // Closed today, 9 days without a session: medium too, more days without a session, no due date.
    const ended = await newClient("ended-closed", coachSetup);
    await createSubscription(coachSetup, ended, {
      startedOn: addDays(today, -40),
      paidThrough: addDays(today, 2),
    });
    const closed = await api("PUT", clientPath(ended, "/subscription"), {
      token: coach.token,
      body: { endedOn: today },
    });
    assertStatus(closed, 200);
    // A client since the subscription started: the session 9 days ago is after the link (C4).
    await setLinkedOn(coach, ended, addDays(today, -40));
    const workoutId = await personalWorkoutOf(ended);
    await insertCompletedSession(ended, workoutId, romeInstant(addDays(today, -9), "18:00"));

    const todayRead = await readToday(coach);
    const items = asList(todayRead.items);

    assert.deepEqual(
      items.map((item) => item.athleteId),
      [unpaid.id, ended.id],
      "a due date sorts before the days without a session",
    );
    assert.deepEqual(reasonsOf(itemOf(items, ended)), {
      severity: "medium",
      risk: {
        level: "medium",
        reasons: [{ kind: "no_recent_session", message: "Nessuna sessione da 9 giorni" }],
      },
      alerts: [],
    });
    assert.equal(asObject(itemOf(items, ended)?.subscription).status, "ended");

    const withParams = await api("GET", "/api/coach/today?handled=1&severity=low&limit=1", {
      token: coach.token,
    });
    assertStatus(withParams, 200);
    assert.deepEqual(withParams.body, todayRead);
  });

  it("inactivity: sessions before the link do not count, also in the order (C4)", async () => {
    const coachSetup = await newCoach("coach-before-link");
    const { coach } = coachSetup;

    // Trained 20 days ago, before becoming a client 3 days ago: not inactive yet.
    const newcomer = await newClient("before-link-new", coachSetup);
    const newcomerWorkoutId = await personalWorkoutOf(newcomer);
    await insertCompletedSession(newcomer, newcomerWorkoutId, romeInstant(addDays(today, -20), "18:00"));
    await setLinkedOn(coach, newcomer, addDays(today, -3));

    // Trained 30 days ago, a client for 8 days: counts from the link, 8 days.
    const sinceLink = await newClient("before-link-old", coachSetup, "Anna Prima");
    const sinceLinkWorkoutId = await personalWorkoutOf(sinceLink);
    await insertCompletedSession(sinceLink, sinceLinkWorkoutId, romeInstant(addDays(today, -30), "18:00"));
    await setLinkedOn(coach, sinceLink, addDays(today, -8));

    // A client for 40 days, last session 10 days ago: more days without a session, so first.
    const afterLink = await newClient("after-link", coachSetup, "Zeno Dopo");
    const afterLinkWorkoutId = await personalWorkoutOf(afterLink);
    await insertCompletedSession(afterLink, afterLinkWorkoutId, romeInstant(addDays(today, -10), "18:00"));
    await setLinkedOn(coach, afterLink, addDays(today, -40));

    const items = await itemsOf(coach);

    assert.equal(itemOf(items, newcomer), undefined, "a client for less than 7 days is not inactive");
    assert.deepEqual(
      items.map((item) => item.athleteId),
      [afterLink.id, sinceLink.id],
      "10 days since the last session before 8 days since the link",
    );
    assert.deepEqual(asObject(itemOf(items, sinceLink)?.risk).reasons, [
      { kind: "no_recent_session", message: "Nessuna sessione da quando è cliente (8 giorni)" },
    ]);
    assert.deepEqual(asObject(itemOf(items, afterLink)?.risk).reasons, [
      { kind: "no_recent_session", message: "Nessuna sessione da 10 giorni" },
    ]);

    const newcomerRow = (await listClients(coach)).find((row) => row.id === newcomer.id);
    assert.equal(newcomerRow?.risk, null, "the clients table follows the same rule");
  });

  it("handled: a client without a row today is not counted and keeps the stored row; back within the week it stays hidden", async () => {
    const coachSetup = await newCoach("coach-handled-pause");
    const { coach } = coachSetup;
    // Expiring in 3 days, trained yesterday: medium.
    const client = await newClient("handled-pause", coachSetup);
    await createSubscription(coachSetup, client, {
      startedOn: addDays(today, -27),
      paidThrough: addDays(today, 3),
    });
    const workoutId = await personalWorkoutOf(client);
    await insertCompletedSession(client, workoutId, romeInstant(addDays(today, -1), "18:00"));
    assert.equal(itemOf(await itemsOf(coach), client)?.severity, "medium");
    await markHandled(coach, client);

    const pause = await api("POST", clientPath(client, "/pause"), {
      token: coach.token,
      body: { startsOn: today, endsOn: addDays(today, 5) },
    });
    assertStatus(pause, 201);
    const whilePaused = await readToday(coach);
    assert.deepEqual(whilePaused.items, []);
    assert.equal(whilePaused.handledCount, 0, "no row today, so not counted");
    assert.equal((await storedHandled(coach, client))?.severityAtHandle, "medium", "the stored row stays");

    assertStatus(await api("DELETE", clientPath(client, "/pause"), { token: coach.token }), 204);
    const afterPause = await readToday(coach);
    assert.deepEqual(afterPause.items, []);
    assert.equal(afterPause.handledCount, 1, "back with the same severity within the week: hidden");
  });
});

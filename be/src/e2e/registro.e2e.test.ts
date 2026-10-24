import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it, mock } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { and, eq, sql } from "drizzle-orm";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;
type ApiResponse = { status: number; body: unknown };
type Account = { id: number; token: string };
type DatabaseModule = typeof import("../db");
type SchemaModule = typeof import("../db/schema");

type Fixtures = {
  database: DatabaseModule;
  schema: SchemaModule;
  coachA: Account;
  coachB: Account;
  inviteCodeA: string;
  inviteCodeB: string;
  monthlyOfferId: number;
  weeklyOfferId: number;
  archivedOfferId: number;
  offerOfCoachBId: number;
  mainClient: Account;
};

const PASSWORD = "smoketest-password";

// Field lists of the contract (docs/contracts/pt-registro.md): internal columns must not leak.
const OFFER_KEYS = [
  "archivedAt",
  "createdAt",
  "id",
  "isRecurring",
  "name",
  "periodCount",
  "periodUnit",
  "priceCents",
  "updatedAt",
];
const SUBSCRIPTION_KEYS = [
  "agreedPriceCents",
  "athleteId",
  "billingDay",
  "createdAt",
  "endedOn",
  "id",
  "isRecurring",
  "offerId",
  "paidThrough",
  "periodCount",
  "periodUnit",
  "startedOn",
  "updatedAt",
];
const PAYMENT_KEYS = [
  "amountCents",
  "canUndo",
  "coversFrom",
  "coversTo",
  "createdAt",
  "id",
  "method",
  "note",
  "paidOn",
  "periods",
];
const PAUSE_KEYS = ["canRemove", "createdAt", "endsOn", "id", "startsOn"];

// Expected dates are computed here, by hand, not with the code under test.
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(Date.UTC(year, month - 1, day + days)));
};

const dayOf = (isoDate: string): number => Number(isoDate.slice(8, 10));

/** Month arithmetic on a billing day, clamped to the last day of a short month. */
const addMonths = (isoDate: string, months: number, billingDay: number): string => {
  const [year, month] = isoDate.split("-").map(Number);
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + months, 0)).getUTCDate();
  const targetDay = Math.min(billingDay, lastDayOfTargetMonth);
  return toIsoDate(new Date(Date.UTC(year, month - 1 + months, targetDay)));
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

const deferred = () => {
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise() };
};

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

describe("PT payment register smoke", { concurrency: false }, () => {
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

  /** A body sent as is, for what `api` cannot build: malformed JSON, too large, odd encodings. */
  const sendRawBody = async (
    method: string,
    path: string,
    rawBody: string,
    options: { token?: string; contentEncoding?: string } = {},
  ): Promise<ApiResponse> => {
    const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });

    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }
    if (options.contentEncoding) {
      headers.set("Content-Encoding", options.contentEncoding);
    }

    const response = await fetch(`${baseUrl}${path}`, { method, headers, body: rawBody });
    return toApiResponse(response);
  };

  const register = async (label: string, isAthlete: boolean): Promise<Account> => {
    const registered = await api("POST", "/api/auth/register", {
      mobile: isAthlete,
      body: {
        email: `registro.${label}.${uniqueSuffix()}@example.com`,
        password: PASSWORD,
        name: `Registro ${label}`,
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

  const newClient = async (label: string, inviteCode: string): Promise<Account> => {
    const athlete = await register(label, true);
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

  const putSubscription = (coach: Account, athlete: Account, body: unknown) =>
    api("PUT", clientPath(athlete, "/subscription"), { token: coach.token, body });

  const createSubscription = async (
    coach: Account,
    athlete: Account,
    body: JsonObject,
  ): Promise<JsonObject> => {
    const created = await putSubscription(coach, athlete, body);
    assertStatus(created, 201);
    return asObject(created.body);
  };

  const readDetail = async (coach: Account, athlete: Account): Promise<JsonObject> => {
    const read = await api("GET", clientPath(athlete, "/subscription"), { token: coach.token });
    assertStatus(read, 200);
    return asObject(read.body);
  };

  const readSubscription = async (coach: Account, athlete: Account): Promise<JsonObject> =>
    asObject((await readDetail(coach, athlete)).subscription);

  const readPayments = async (coach: Account, athlete: Account): Promise<JsonObject[]> => {
    const read = await api("GET", clientPath(athlete, "/payments"), { token: coach.token });
    assertStatus(read, 200);
    return asList(read.body);
  };

  const postPayment = (coach: Account, athlete: Account, body: unknown) =>
    api("POST", clientPath(athlete, "/payments"), { token: coach.token, body });

  const recordPayment = async (
    coach: Account,
    athlete: Account,
    body: JsonObject,
  ): Promise<JsonObject> => {
    const recorded = await postPayment(coach, athlete, body);
    assertStatus(recorded, 201);
    return asObject(recorded.body);
  };

  const deletePayment = (coach: Account, athlete: Account, paymentId: unknown) =>
    api("DELETE", clientPath(athlete, `/payments/${paymentId}`), { token: coach.token });

  const postPause = (coach: Account, athlete: Account, body: unknown) =>
    api("POST", clientPath(athlete, "/pause"), { token: coach.token, body });

  const deletePause = (coach: Account, athlete: Account) =>
    api("DELETE", clientPath(athlete, "/pause"), { token: coach.token });

  const preview = (coach: Account, athlete: Account, query: string) =>
    api("GET", clientPath(athlete, `/payments/preview?${query}`), { token: coach.token });

  /** Read-only look at the stored row, for what the API never exposes (revision, endedOn after unlink). */
  const storedSubscription = async (coach: Account, athlete: Account) => {
    const { database, schema } = setup();
    const [row] = await database.db
      .select()
      .from(schema.clientSubscriptions)
      .where(
        and(
          eq(schema.clientSubscriptions.coachId, coach.id),
          eq(schema.clientSubscriptions.athleteId, athlete.id),
        ),
      );
    return row ?? null;
  };

  /**
   * Waits until enough statements matching the pattern are blocked on a lock in this database,
   * so a concurrency test knows the order instead of hoping for it.
   */
  const waitForLockWait = async (
    queryPattern: string,
    minimumWaiting = 1,
    attemptsLeft = 100,
  ): Promise<void> => {
    const { database } = setup();
    const result = await database.db.execute(
      sql`select count(*)::int as waiting from pg_stat_activity
          where datname = current_database() and wait_event_type = 'Lock'
          and query ilike ${queryPattern}`,
    );
    if (Number(result.rows[0]?.waiting) >= minimumWaiting) {
      return;
    }
    assert.ok(attemptsLeft > 0, `fewer than ${minimumWaiting} waited on a lock for ${queryPattern}`);
    await delay(20);
    return waitForLockWait(queryPattern, minimumWaiting, attemptsLeft - 1);
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
    const inviteCodeA = await inviteCodeOf(coachA);
    const inviteCodeB = await inviteCodeOf(coachB);

    const monthlyOffer = await createOffer(coachA, {
      name: "Coaching mensile",
      priceCents: 8000,
      periodUnit: "month",
      periodCount: 1,
    });
    const weeklyOffer = await createOffer(coachA, {
      name: "Blocco 4 settimane",
      priceCents: 2000,
      periodUnit: "week",
      periodCount: 4,
      isRecurring: false,
    });
    const archivedOffer = await createOffer(coachA, {
      name: "Trimestrale vecchio",
      priceCents: 20000,
      periodUnit: "month",
      periodCount: 3,
    });
    const archived = await api("PATCH", `/api/coach/offers/${archivedOffer.id}`, {
      token: coachA.token,
      body: { archived: true },
    });
    assertStatus(archived, 200);
    const offerOfCoachB = await createOffer(coachB, {
      name: "Offerta coach B",
      priceCents: 9000,
      periodUnit: "month",
      periodCount: 1,
    });

    const mainClient = await newClient("main", inviteCodeA);

    fixtures = {
      database,
      schema,
      coachA,
      coachB,
      inviteCodeA,
      inviteCodeB,
      monthlyOfferId: Number(monthlyOffer.id),
      weeklyOfferId: Number(weeklyOffer.id),
      archivedOfferId: Number(archivedOffer.id),
      offerOfCoachBId: Number(offerOfCoachB.id),
      mainClient,
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

  // --- Price list ---------------------------------------------------------------------------

  it("offers: create with defaults, refuse bad input, archive idempotently, reactivate", async () => {
    const { coachA, coachB, offerOfCoachBId } = setup();

    const created = await createOffer(coachA, {
      name: "  Abbonamento prova  ",
      priceCents: 0,
      periodUnit: "week",
      periodCount: 52,
      unknownField: "ignored",
    });
    assertKeys(created, OFFER_KEYS);
    assert.equal(created.name, "Abbonamento prova");
    assert.equal(created.priceCents, 0);
    assert.equal(created.periodUnit, "week");
    assert.equal(created.periodCount, 52);
    assert.equal(created.isRecurring, true, "isRecurring defaults to true");
    assert.equal(created.archivedAt, null);

    const refusals: [unknown, string][] = [
      [[], "Invalid request body"],
      [{ name: "   ", priceCents: 1, periodUnit: "month", periodCount: 1 }, "name is required"],
      [
        { name: "x".repeat(101), priceCents: 1, periodUnit: "month", periodCount: 1 },
        "name must be at most 100 characters",
      ],
      [
        { name: "Caro", priceCents: 1_000_001, periodUnit: "month", periodCount: 1 },
        "priceCents must be an integer between 0 and 1000000",
      ],
      [
        { name: "Giorno", priceCents: 1, periodUnit: "day", periodCount: 1 },
        "periodUnit must be month or week",
      ],
      [
        { name: "Lungo", priceCents: 1, periodUnit: "week", periodCount: 53 },
        "periodCount must be an integer between 1 and 52",
      ],
      [
        { name: "Flag", priceCents: 1, periodUnit: "week", periodCount: 1, isRecurring: "yes" },
        "isRecurring must be a boolean",
      ],
    ];
    for (const [body, error] of refusals) {
      assertError(await api("POST", "/api/coach/offers", { token: coachA.token, body }), 400, error);
    }

    const path = `/api/coach/offers/${created.id}`;
    assertError(
      await api("PATCH", "/api/coach/offers/abc", { token: coachA.token, body: { archived: true } }),
      400,
      "Invalid offer id",
    );
    assertError(
      await api("PATCH", path, { token: coachA.token, body: { unknownField: 1 } }),
      400,
      "At least one field is required",
    );
    assertError(
      await api("PATCH", path, { token: coachA.token, body: { archived: "yes" } }),
      400,
      "archived must be a boolean",
    );

    const archived = await api("PATCH", path, { token: coachA.token, body: { archived: true } });
    assertStatus(archived, 200);
    const archivedAt = asObject(archived.body).archivedAt;
    assert.equal(typeof archivedAt, "string");

    const archivedAgain = await api("PATCH", path, {
      token: coachA.token,
      body: { archived: true, priceCents: 1500 },
    });
    assertStatus(archivedAgain, 200);
    assert.equal(asObject(archivedAgain.body).archivedAt, archivedAt, "archiving twice keeps the date");
    assert.equal(asObject(archivedAgain.body).priceCents, 1500, "an archived offer can be edited");

    const listed = await api("GET", "/api/coach/offers", { token: coachA.token });
    assertStatus(listed, 200);
    const offers = asList(listed.body);
    offers.forEach((offer) => assertKeys(offer, OFFER_KEYS));
    const expectedOrder = [...offers].sort((first, second) => {
      const archivedDifference = Number(first.archivedAt !== null) - Number(second.archivedAt !== null);
      if (archivedDifference !== 0) {
        return archivedDifference;
      }
      const nameDifference = String(first.name).localeCompare(String(second.name), "en");
      if (nameDifference !== 0) {
        return nameDifference;
      }
      return Number(first.id) - Number(second.id);
    });
    assert.deepEqual(
      offers.map((offer) => offer.id),
      expectedOrder.map((offer) => offer.id),
      "not archived first, then name, then id",
    );
    assert.ok(offers.some((offer) => offer.id === created.id && offer.archivedAt !== null));
    assert.ok(
      offers.every((offer) => offer.id !== offerOfCoachBId),
      "another coach's offers are not listed",
    );

    const reactivated = await api("PATCH", path, { token: coachA.token, body: { archived: false } });
    assertStatus(reactivated, 200);
    assert.equal(asObject(reactivated.body).archivedAt, null);

    assertError(
      await api("PATCH", `/api/coach/offers/${created.id}`, {
        token: coachB.token,
        body: { name: "Rubata" },
      }),
      404,
      "Offer not found",
    );
    assertError(
      await api("PATCH", "/api/coach/offers/999999999", { token: coachA.token, body: { name: "X" } }),
      404,
      "Offer not found",
    );
    const untouched = await api("GET", "/api/coach/offers", { token: coachA.token });
    const stillMine = asList(untouched.body).find((offer) => offer.id === created.id);
    assert.equal(asObject(stillMine).name, "Abbonamento prova");
  });

  // --- Subscription -------------------------------------------------------------------------

  const mainStart = addDays(today, -10);
  const mainBillingDay = dayOf(mainStart);
  const mainFirst = addMonths(mainStart, 1, mainBillingDay);
  const mainSecond = addMonths(mainStart, 2, mainBillingDay);
  const mainThird = addMonths(mainStart, 3, mainBillingDay);

  it("subscription: a client without one reads as null; writes need one", async () => {
    const { coachA, mainClient } = setup();

    assert.deepEqual(await readDetail(coachA, mainClient), {
      subscription: null,
      state: null,
      activePause: null,
    });
    assert.deepEqual(await readPayments(coachA, mainClient), []);
    assertError(
      await preview(coachA, mainClient, `paidOn=${today}`),
      404,
      "Subscription not found",
    );
    assertError(
      await postPayment(coachA, mainClient, { amountCents: 1, paidOn: today, method: "cash" }),
      404,
      "Subscription not found",
    );
    assertError(
      await postPause(coachA, mainClient, { startsOn: addDays(today, 1), endsOn: addDays(today, 2) }),
      404,
      "Subscription not found",
    );
    assertError(await deletePause(coachA, mainClient), 404, "Subscription not found");
    assertError(await deletePayment(coachA, mainClient, 1), 404, "Payment not found");
  });

  it("subscription: creation refusals", async () => {
    const { coachA, mainClient, monthlyOfferId, archivedOfferId, offerOfCoachBId } = setup();

    assertError(await putSubscription(coachA, mainClient, [1]), 400, "Invalid request body");
    assertError(await putSubscription(coachA, mainClient, {}), 400, "offerId is required");
    assertError(
      await putSubscription(coachA, mainClient, { offerId: monthlyOfferId }),
      400,
      "startedOn must be YYYY-MM-DD",
    );
    assertError(
      await putSubscription(coachA, mainClient, { offerId: 0, startedOn: mainStart }),
      400,
      "Invalid offer id",
    );
    assertError(
      await putSubscription(coachA, mainClient, { offerId: monthlyOfferId, startedOn: "2026-02-30" }),
      400,
      "startedOn must be YYYY-MM-DD",
    );
    assertError(
      await putSubscription(coachA, mainClient, { offerId: monthlyOfferId, startedOn: "1999-12-31" }),
      400,
      "startedOn must be YYYY-MM-DD",
    );
    assertError(
      await putSubscription(coachA, mainClient, {
        offerId: monthlyOfferId,
        startedOn: mainStart,
        paidThrough: addDays(mainStart, -1),
      }),
      400,
      "paidThrough must be on or after startedOn",
    );
    assertError(
      await putSubscription(coachA, mainClient, { offerId: archivedOfferId, startedOn: mainStart }),
      409,
      "Offer is archived",
    );
    assertError(
      await putSubscription(coachA, mainClient, { offerId: offerOfCoachBId, startedOn: mainStart }),
      404,
      "Offer not found",
    );
    assert.equal(await storedSubscription(coachA, mainClient), null, "no refused PUT wrote a row");
  });

  it("subscription: PUT creates (201) with the offer terms, then edits (200) the price", async () => {
    const { coachA, mainClient, monthlyOfferId } = setup();

    const created = await createSubscription(coachA, mainClient, {
      offerId: monthlyOfferId,
      startedOn: mainStart,
    });
    assertKeys(created, ["activePause", "state", "subscription"]);
    const subscription = asObject(created.subscription);
    assertKeys(subscription, SUBSCRIPTION_KEYS);
    assert.equal(subscription.athleteId, mainClient.id);
    assert.equal(subscription.offerId, monthlyOfferId);
    assert.equal(subscription.agreedPriceCents, 8000, "price defaults to the offer price");
    assert.equal(subscription.periodUnit, "month");
    assert.equal(subscription.periodCount, 1);
    assert.equal(subscription.isRecurring, true);
    assert.equal(subscription.startedOn, mainStart);
    assert.equal(subscription.paidThrough, mainStart, "paidThrough defaults to startedOn");
    assert.equal(subscription.billingDay, mainBillingDay);
    assert.equal(subscription.endedOn, null);
    assert.deepEqual(created.state, { status: "expired", daysLeft: -10, pausedUntil: null });
    assert.equal(created.activePause, null);

    const repriced = await putSubscription(coachA, mainClient, { agreedPriceCents: 7000 });
    assertStatus(repriced, 200);
    const repricedSubscription = asObject(asObject(repriced.body).subscription);
    assert.equal(repricedSubscription.id, subscription.id, "one row per coach and athlete");
    assert.equal(repricedSubscription.agreedPriceCents, 7000);
    assert.equal(repricedSubscription.paidThrough, mainStart);
    assert.equal(repricedSubscription.billingDay, mainBillingDay);

    assertError(
      await putSubscription(coachA, mainClient, { unknownField: 1 }),
      400,
      "At least one field is required",
    );
    assertError(
      await putSubscription(coachA, mainClient, { paidThrough: addDays(mainStart, 1) }),
      400,
      "paidThrough cannot be changed after creation",
    );
    assertError(
      await putSubscription(coachA, mainClient, { startedOn: addDays(mainStart, 1) }),
      400,
      "paidThrough must be on or after startedOn",
    );
    const samePaidThrough = await putSubscription(coachA, mainClient, { paidThrough: mainStart });
    assertStatus(samePaidThrough, 200);

    const stored = await storedSubscription(coachA, mainClient);
    assert.equal(stored?.revision, 0, "price edits do not move the revision");
  });

  // --- Payment preview ----------------------------------------------------------------------

  it("preview: a late payment suggests paid_through and shows both starts", async () => {
    const { coachA, mainClient } = setup();

    const late = await preview(coachA, mainClient, `paidOn=${today}`);
    assertStatus(late, 200);
    assert.deepEqual(late.body, {
      paidOn: today,
      periods: 1,
      suggestedStart: "paid_through",
      suggestedAmountCents: 7000,
      isSuggestedAmountCapped: false,
      options: [
        { start: "paid_through", coversFrom: mainStart, coversTo: mainFirst, isAllowed: true },
        {
          start: "paid_on",
          coversFrom: today,
          coversTo: addMonths(today, 1, dayOf(today)),
          isAllowed: true,
        },
      ],
    });

    const twoPeriods = await preview(coachA, mainClient, `paidOn=${today}&periods=2`);
    assertStatus(twoPeriods, 200);
    const twoBody = asObject(twoPeriods.body);
    assert.equal(twoBody.suggestedAmountCents, 14000);
    assert.equal(asList(twoBody.options)[0].coversTo, mainSecond);

    assertError(
      await preview(coachA, mainClient, `paidOn=${addDays(today, 1)}`),
      400,
      "paidOn must not be in the future",
    );
    assertError(await preview(coachA, mainClient, "paidOn=oggi"), 400, "paidOn must be YYYY-MM-DD");
    assertError(
      await preview(coachA, mainClient, `paidOn=${today}&periods=13`),
      400,
      "periods must be an integer between 1 and 12",
    );
    assertError(
      await preview(coachA, mainClient, `paidOn=${today}&periods=1.5`),
      400,
      "periods must be an integer between 1 and 12",
    );
  });

  it("input: a NUL is 400, and the preview never suggests more than the payment cap", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("nul-and-cap", inviteCodeA);
    const offer = await createOffer(coachA, {
      name: "Massimo",
      priceCents: 1_000_000,
      periodUnit: "month",
      periodCount: 1,
    });
    await createSubscription(coachA, client, { offerId: offer.id, startedOn: today });

    assertError(
      await api("POST", "/api/coach/offers", {
        token: coachA.token,
        body: { name: "Nome\u0000", priceCents: 1000, periodUnit: "month", periodCount: 1 },
      }),
      400,
      "name must not contain a NUL character",
    );
    assertError(
      await postPayment(coachA, client, {
        amountCents: 100,
        paidOn: today,
        method: "cash",
        note: "prima\u0000dopo",
      }),
      400,
      "note must not contain a NUL character",
    );

    const capped = await preview(coachA, client, `paidOn=${today}&periods=12`);
    assertStatus(capped, 200);
    const cappedBody = asObject(capped.body);
    assert.equal(cappedBody.suggestedAmountCents, 1_000_000);
    assert.equal(cappedBody.isSuggestedAmountCapped, true);

    const paid = await recordPayment(coachA, client, {
      amountCents: cappedBody.suggestedAmountCents,
      paidOn: today,
      method: "cash",
      periods: 12,
    });
    assert.equal(asObject(paid.payment).amountCents, 1_000_000);
  });

  // --- Payments -----------------------------------------------------------------------------

  it("payments: late payments continue from paidThrough; history, canUndo, undo only the latest", async () => {
    const { coachA, mainClient } = setup();

    const refusals: [unknown, string][] = [
      [[], "Invalid request body"],
      [{ amountCents: -1, paidOn: today, method: "cash" }, "amountCents must be an integer between 0 and 1000000"],
      [{ amountCents: 1, paidOn: addDays(today, 1), method: "cash" }, "paidOn must not be in the future"],
      [
        { amountCents: 1, paidOn: today, method: "bitcoin" },
        "method must be one of cash, bank_transfer, satispay, paypal, other",
      ],
      [{ amountCents: 1, paidOn: today, method: "cash", periods: 13 }, "periods must be an integer between 1 and 12"],
      [{ amountCents: 1, paidOn: today, method: "cash", start: "today" }, "start must be paid_through or paid_on"],
      [{ amountCents: 1, paidOn: today, method: "cash", note: 5 }, "note must be a string or null"],
      [{ amountCents: 1, paidOn: today, method: "cash", note: "x".repeat(501) }, "note must be at most 500 characters"],
    ];
    for (const [body, error] of refusals) {
      assertError(await postPayment(coachA, mainClient, body), 400, error);
    }

    const first = await recordPayment(coachA, mainClient, {
      amountCents: 7000,
      paidOn: addDays(today, -5),
      method: "satispay",
      note: "  primo mese  ",
    });
    assertKeys(first, ["payment", "start", "subscription"]);
    assert.equal(first.start, "paid_through", "default start is the suggested one");
    const firstPayment = asObject(first.payment);
    assertKeys(firstPayment, PAYMENT_KEYS);
    assert.equal(firstPayment.amountCents, 7000);
    assert.equal(firstPayment.paidOn, addDays(today, -5));
    assert.equal(firstPayment.method, "satispay");
    assert.equal(firstPayment.periods, 1);
    assert.equal(firstPayment.coversFrom, mainStart, "a late payment starts from the old paidThrough");
    assert.equal(firstPayment.coversTo, mainFirst);
    assert.equal(firstPayment.note, "primo mese");
    assert.equal(firstPayment.canUndo, true);
    assertKeys(first.subscription, SUBSCRIPTION_KEYS);
    assert.equal(asObject(first.subscription).paidThrough, mainFirst);
    assert.equal(asObject(first.subscription).billingDay, mainBillingDay);

    const second = await recordPayment(coachA, mainClient, {
      amountCents: 7000,
      paidOn: today,
      method: "cash",
      note: "   ",
    });
    const secondPayment = asObject(second.payment);
    assert.equal(secondPayment.coversFrom, mainFirst);
    assert.equal(secondPayment.coversTo, mainSecond);
    assert.equal(secondPayment.note, null, "a blank note is stored as null");

    assertError(
      await postPayment(coachA, mainClient, {
        amountCents: 7000,
        paidOn: today,
        method: "cash",
        start: "paid_on",
      }),
      400,
      "Payment would shorten the paid period",
    );
    const shortening = await preview(coachA, mainClient, `paidOn=${today}`);
    assertStatus(shortening, 200);
    assert.deepEqual(
      asList(asObject(shortening.body).options).map((option) => option.isAllowed),
      [true, false],
      "paid_on is not allowed when it would shorten the paid period",
    );

    // Recorded last but paid earliest: listed last, yet it is the one that can be undone.
    const third = await recordPayment(coachA, mainClient, {
      amountCents: 7000,
      paidOn: addDays(today, -8),
      method: "bank_transfer",
      start: "paid_through",
    });
    const thirdPayment = asObject(third.payment);
    assert.equal(thirdPayment.coversFrom, mainSecond);
    assert.equal(thirdPayment.coversTo, mainThird);

    const history = await readPayments(coachA, mainClient);
    history.forEach((payment) => assertKeys(payment, PAYMENT_KEYS));
    assert.deepEqual(
      history.map((payment) => [payment.id, payment.canUndo]),
      [
        [secondPayment.id, false],
        [firstPayment.id, false],
        [thirdPayment.id, true],
      ],
      "paidOn descending, then id descending; only the latest recorded can be undone",
    );

    assertError(
      await deletePayment(coachA, mainClient, firstPayment.id),
      409,
      "Only the latest payment can be undone",
    );
    assertError(
      await deletePayment(coachA, mainClient, secondPayment.id),
      409,
      "Only the latest payment can be undone",
    );
    assertError(await deletePayment(coachA, mainClient, 999999999), 404, "Payment not found");
    assertError(await deletePayment(coachA, mainClient, 0), 400, "Invalid payment id");
    assertError(await deletePayment(coachA, mainClient, "abc"), 400, "Invalid payment id");

    assertStatus(await deletePayment(coachA, mainClient, thirdPayment.id), 204);
    const afterThirdUndo = await readSubscription(coachA, mainClient);
    assert.equal(afterThirdUndo.paidThrough, mainSecond);
    assert.equal(afterThirdUndo.billingDay, mainBillingDay);

    assertStatus(await deletePayment(coachA, mainClient, secondPayment.id), 204);
    const afterSecondUndo = await readSubscription(coachA, mainClient);
    assert.equal(afterSecondUndo.paidThrough, mainFirst);

    assert.deepEqual(
      (await readPayments(coachA, mainClient)).map((payment) => [payment.id, payment.canUndo]),
      [[firstPayment.id, true]],
      "undoing goes back one revision, so the previous payment can be undone in turn",
    );
    assert.equal((await storedSubscription(coachA, mainClient))?.revision, 1);
  });

  it("payments: a client back after a long break restarts from paidOn; undo restores billingDay", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("returning", inviteCodeA);

    // A start whose day of month differs from today, so the billing day change is visible.
    const hundredDaysAgo = addDays(today, -100);
    const lastPaid = dayOf(hundredDaysAgo) === dayOf(today) ? addDays(today, -101) : hundredDaysAgo;
    await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn: lastPaid });

    const restart = addMonths(today, 1, dayOf(today));
    const previewed = await preview(coachA, client, `paidOn=${today}`);
    assertStatus(previewed, 200);
    assert.deepEqual(previewed.body, {
      paidOn: today,
      periods: 1,
      suggestedStart: "paid_on",
      suggestedAmountCents: 8000,
      isSuggestedAmountCapped: false,
      options: [
        {
          start: "paid_through",
          coversFrom: lastPaid,
          coversTo: addMonths(lastPaid, 1, dayOf(lastPaid)),
          isAllowed: true,
        },
        { start: "paid_on", coversFrom: today, coversTo: restart, isAllowed: true },
      ],
    });

    const recorded = await recordPayment(coachA, client, {
      amountCents: 8000,
      paidOn: today,
      method: "paypal",
    });
    assert.equal(recorded.start, "paid_on");
    assert.equal(asObject(recorded.payment).coversFrom, today);
    assert.equal(asObject(recorded.payment).coversTo, restart);
    assert.equal(asObject(recorded.subscription).paidThrough, restart);
    assert.equal(asObject(recorded.subscription).billingDay, dayOf(today), "paidOn is the new billing day");

    assertStatus(await deletePayment(coachA, client, asObject(recorded.payment).id), 204);
    const restored = await readSubscription(coachA, client);
    assert.equal(restored.paidThrough, lastPaid);
    assert.equal(restored.billingDay, dayOf(lastPaid));
    assert.deepEqual(await readPayments(coachA, client), []);
    assert.equal((await storedSubscription(coachA, client))?.revision, 0);
  });

  // --- Offer change -------------------------------------------------------------------------

  it("subscription: changing to an offer with another period unit resets billingDay and moves the revision", async () => {
    const { coachA, mainClient, weeklyOfferId, monthlyOfferId, archivedOfferId } = setup();
    const [onlyPayment] = await readPayments(coachA, mainClient);
    assert.equal(onlyPayment.canUndo, true);

    const toWeekly = await putSubscription(coachA, mainClient, { offerId: weeklyOfferId });
    assertStatus(toWeekly, 200);
    const weekly = asObject(asObject(toWeekly.body).subscription);
    assert.equal(weekly.offerId, weeklyOfferId);
    assert.equal(weekly.periodUnit, "week");
    assert.equal(weekly.periodCount, 4);
    assert.equal(weekly.isRecurring, false);
    assert.equal(weekly.agreedPriceCents, 2000, "price follows the new offer when not given");
    assert.equal(weekly.startedOn, mainStart);
    assert.equal(weekly.paidThrough, mainFirst);
    assert.equal(weekly.billingDay, dayOf(mainFirst));

    assert.equal((await readPayments(coachA, mainClient))[0].canUndo, false);
    assertError(
      await deletePayment(coachA, mainClient, onlyPayment.id),
      409,
      "Only the latest change can be undone",
    );

    const weeklyEnd = addDays(mainFirst, 28);
    const weeklyPayment = await recordPayment(coachA, mainClient, {
      amountCents: 2000,
      paidOn: today,
      method: "other",
      start: "paid_through",
    });
    assert.equal(asObject(weeklyPayment.payment).coversFrom, mainFirst);
    assert.equal(asObject(weeklyPayment.payment).coversTo, weeklyEnd);

    const toMonthly = await putSubscription(coachA, mainClient, {
      offerId: monthlyOfferId,
      agreedPriceCents: 7500,
    });
    assertStatus(toMonthly, 200);
    const monthly = asObject(asObject(toMonthly.body).subscription);
    assert.equal(monthly.periodUnit, "month");
    assert.equal(monthly.periodCount, 1);
    assert.equal(monthly.agreedPriceCents, 7500, "a price in the body wins over the offer price");
    assert.equal(monthly.billingDay, dayOf(weeklyEnd));
    assert.equal(
      (await readPayments(coachA, mainClient)).find((payment) => payment.id === asObject(weeklyPayment.payment).id)
        ?.canUndo,
      false,
    );

    assertError(
      await putSubscription(coachA, mainClient, { offerId: archivedOfferId }),
      409,
      "Offer is archived",
    );

    const monthlyAgainEnd = addMonths(weeklyEnd, 1, dayOf(weeklyEnd));
    const latest = await recordPayment(coachA, mainClient, {
      amountCents: 7500,
      paidOn: today,
      method: "cash",
      start: "paid_through",
    });
    assert.equal(asObject(latest.payment).coversFrom, weeklyEnd);
    assert.equal(asObject(latest.payment).coversTo, monthlyAgainEnd);
    const latestId = asObject(latest.payment).id;

    // Same period unit: no billing day reset, no revision move, so the payment stays undoable.
    const discount = await createOffer(coachA, {
      name: "Mensile scontato",
      priceCents: 6000,
      periodUnit: "month",
      periodCount: 1,
    });
    const toDiscount = await putSubscription(coachA, mainClient, { offerId: discount.id });
    assertStatus(toDiscount, 200);
    const discounted = asObject(asObject(toDiscount.body).subscription);
    assert.equal(discounted.agreedPriceCents, 6000);
    assert.equal(discounted.billingDay, dayOf(weeklyEnd));
    assert.equal(discounted.paidThrough, monthlyAgainEnd);

    const archivedDiscount = await api("PATCH", `/api/coach/offers/${discount.id}`, {
      token: coachA.token,
      body: { archived: true },
    });
    assertStatus(archivedDiscount, 200);
    const sameArchivedOffer = await putSubscription(coachA, mainClient, {
      offerId: discount.id,
      agreedPriceCents: 6500,
    });
    assertStatus(sameArchivedOffer, 200);
    assert.equal(asObject(asObject(sameArchivedOffer.body).subscription).agreedPriceCents, 6500);
    const priceOnly = await putSubscription(coachA, mainClient, { agreedPriceCents: 6600 });
    assertStatus(priceOnly, 200);
    assert.equal(asObject(asObject(priceOnly.body).subscription).agreedPriceCents, 6600);

    const payments = await readPayments(coachA, mainClient);
    assert.deepEqual(
      payments.filter((payment) => payment.canUndo).map((payment) => payment.id),
      [latestId],
    );
  });

  // --- Ending -------------------------------------------------------------------------------

  it("ending: an ended subscription refuses writes, still reads, and resumes with endedOn null", async () => {
    const { coachA, mainClient } = setup();
    const paymentsBefore = await readPayments(coachA, mainClient);
    const latestId = paymentsBefore.filter((payment) => payment.canUndo).map((payment) => payment.id)[0];
    assert.ok(latestId !== undefined);

    assertError(
      await putSubscription(coachA, mainClient, { endedOn: addDays(mainStart, -1) }),
      400,
      "endedOn must be on or after startedOn",
    );
    assertError(
      await putSubscription(coachA, mainClient, { endedOn: "domani" }),
      400,
      "endedOn must be YYYY-MM-DD or null",
    );

    const endsLater = await putSubscription(coachA, mainClient, { endedOn: addDays(today, 3) });
    assertStatus(endsLater, 200);
    assert.notEqual(asObject(asObject(endsLater.body).state).status, "ended");
    assert.equal(
      (await readPayments(coachA, mainClient)).find((payment) => payment.id === latestId)?.canUndo,
      true,
      "an end date in the future still allows writes",
    );

    const ended = await putSubscription(coachA, mainClient, { endedOn: today });
    assertStatus(ended, 200);
    const endedBody = asObject(ended.body);
    assert.equal(asObject(endedBody.subscription).endedOn, today);
    assert.equal(asObject(endedBody.state).status, "ended");
    assert.equal(asObject(endedBody.state).pausedUntil, null);

    assertError(
      await postPayment(coachA, mainClient, { amountCents: 1, paidOn: today, method: "cash" }),
      409,
      "Subscription has ended",
    );
    assertError(
      await postPause(coachA, mainClient, { startsOn: addDays(today, 1), endsOn: addDays(today, 5) }),
      409,
      "Subscription has ended",
    );
    assertError(await deletePause(coachA, mainClient), 409, "Subscription has ended");
    assertError(await deletePayment(coachA, mainClient, latestId), 409, "Subscription has ended");
    assert.ok((await readPayments(coachA, mainClient)).every((payment) => payment.canUndo === false));
    assert.equal(asObject((await readDetail(coachA, mainClient)).state).status, "ended");
    assertStatus(await preview(coachA, mainClient, `paidOn=${today}`), 200);

    const resumed = await putSubscription(coachA, mainClient, { endedOn: null });
    assertStatus(resumed, 200);
    const resumedBody = asObject(resumed.body);
    assert.equal(asObject(resumedBody.subscription).endedOn, null);
    assert.notEqual(asObject(resumedBody.state).status, "ended");
    assert.equal(
      (await readPayments(coachA, mainClient)).find((payment) => payment.id === latestId)?.canUndo,
      true,
      "ending and resuming do not move the revision",
    );
    const paidThrough = String(asObject(resumedBody.subscription).paidThrough);
    const afterResume = await recordPayment(coachA, mainClient, {
      amountCents: 6600,
      paidOn: today,
      method: "cash",
    });
    assert.equal(asObject(afterResume.payment).coversFrom, paidThrough);
  });

  // --- Pause --------------------------------------------------------------------------------

  it("pause: a future pause shifts a paid subscription; removing it restores and makes the payment undoable again", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("pause-future", inviteCodeA);
    const startedOn = addDays(today, -10);
    await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn });

    const paid = await recordPayment(coachA, client, {
      amountCents: 8000,
      paidOn: today,
      method: "cash",
      start: "paid_through",
    });
    const paidThrough = addMonths(startedOn, 1, dayOf(startedOn));
    assert.equal(asObject(paid.subscription).paidThrough, paidThrough);
    const paymentId = asObject(paid.payment).id;

    const pauseStart = addDays(today, 5);
    const pauseEnd = addDays(today, 14);
    const shifted = addDays(paidThrough, 10);
    const created = await postPause(coachA, client, { startsOn: pauseStart, endsOn: pauseEnd });
    assertStatus(created, 201);
    const createdBody = asObject(created.body);
    assertKeys(createdBody, ["pause", "subscription"]);
    const pause = asObject(createdBody.pause);
    assertKeys(pause, PAUSE_KEYS);
    assert.equal(pause.startsOn, pauseStart);
    assert.equal(pause.endsOn, pauseEnd);
    assert.equal(pause.canRemove, true);
    assertKeys(createdBody.subscription, SUBSCRIPTION_KEYS);
    assert.equal(asObject(createdBody.subscription).paidThrough, shifted, "paid into the pause: + its length");
    assert.equal(asObject(createdBody.subscription).billingDay, dayOf(shifted));

    const detail = await readDetail(coachA, client);
    assert.equal(asObject(detail.activePause).id, pause.id);
    assert.equal(asObject(detail.activePause).canRemove, true);
    assert.equal(asObject(detail.state).status, "active", "a future pause is not running yet");
    assert.equal(asObject(detail.state).pausedUntil, null);

    assert.equal((await readPayments(coachA, client))[0].canUndo, false);
    assertError(
      await deletePayment(coachA, client, paymentId),
      409,
      "Only the latest change can be undone",
    );
    assertError(
      await postPause(coachA, client, { startsOn: addDays(today, 30), endsOn: addDays(today, 35) }),
      409,
      "Subscription already has an active pause",
    );

    assertStatus(await deletePause(coachA, client), 204);
    const restoredDetail = await readDetail(coachA, client);
    assert.equal(asObject(restoredDetail.subscription).paidThrough, paidThrough);
    assert.equal(asObject(restoredDetail.subscription).billingDay, dayOf(startedOn));
    assert.equal(restoredDetail.activePause, null);
    assertError(await deletePause(coachA, client), 404, "No active pause");

    assert.equal((await readPayments(coachA, client))[0].canUndo, true);
    assertStatus(await deletePayment(coachA, client, paymentId), 204);
    assert.equal((await readSubscription(coachA, client)).paidThrough, startedOn);
    assert.equal((await storedSubscription(coachA, client))?.revision, 0);
  });

  it("pause: an expired subscription does not move", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("pause-expired", inviteCodeA);
    const startedOn = addDays(today, -20);
    await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn });

    const created = await postPause(coachA, client, {
      startsOn: addDays(today, 1),
      endsOn: addDays(today, 10),
    });
    assertStatus(created, 201);
    const subscription = asObject(asObject(created.body).subscription);
    assert.equal(subscription.paidThrough, startedOn, "nothing paid inside the pause, nothing moves");
    assert.equal(subscription.billingDay, dayOf(startedOn));

    assertStatus(await deletePause(coachA, client), 204);
    const restored = await readSubscription(coachA, client);
    assert.equal(restored.paidThrough, startedOn);
    assert.equal(restored.billingDay, dayOf(startedOn));
  });

  it("pause: removing a running pause ends it yesterday and gives back the unused days", async () => {
    const { coachA, inviteCodeA, monthlyOfferId, schema, database } = setup();
    const client = await newClient("pause-running", inviteCodeA);
    const startedOn = addDays(today, -30);
    const paidThrough = addDays(today, 20);
    const created = await createSubscription(coachA, client, {
      offerId: monthlyOfferId,
      startedOn,
      paidThrough,
    });
    assert.equal(asObject(created.subscription).paidThrough, paidThrough);
    assert.equal(asObject(created.subscription).billingDay, dayOf(paidThrough));

    assertError(
      await postPause(coachA, client, { startsOn: addDays(today, -32), endsOn: today }),
      400,
      "startsOn must be at most 31 days ago",
    );
    assertError(
      await postPause(coachA, client, { startsOn: addDays(today, -31), endsOn: today }),
      400,
      "startsOn must be on or after startedOn",
    );
    assertError(
      await postPause(coachA, client, { startsOn: today, endsOn: addDays(today, 180) }),
      400,
      "Pause must be at most 180 days",
    );
    assertError(
      await postPause(coachA, client, { startsOn: today, endsOn: addDays(today, -1) }),
      400,
      "endsOn must be on or after startsOn",
    );
    assertError(await postPause(coachA, client, [today]), 400, "Invalid request body");

    const pauseStart = addDays(today, -5);
    const pauseEnd = addDays(today, 10);
    const pausedThrough = addDays(paidThrough, 16);
    const paused = await postPause(coachA, client, { startsOn: pauseStart, endsOn: pauseEnd });
    assertStatus(paused, 201);
    assert.equal(asObject(asObject(paused.body).subscription).paidThrough, pausedThrough);

    const running = await readDetail(coachA, client);
    assert.deepEqual(running.state, { status: "paused", daysLeft: 36, pausedUntil: pauseEnd });
    assert.equal(asObject(running.activePause).canRemove, true);

    assertStatus(await deletePause(coachA, client), 204);
    const yesterday = addDays(today, -1);
    const endedEarly = addDays(paidThrough, 5);
    const afterRemoval = await readDetail(coachA, client);
    assert.equal(asObject(afterRemoval.subscription).paidThrough, endedEarly, "5 paused days kept, 11 given back");
    assert.equal(asObject(afterRemoval.subscription).billingDay, dayOf(endedEarly));
    assert.equal(afterRemoval.activePause, null);
    assert.deepEqual(afterRemoval.state, { status: "active", daysLeft: 25, pausedUntil: null });

    const [storedPause] = await database.db
      .select()
      .from(schema.subscriptionPauses)
      .where(eq(schema.subscriptionPauses.subscriptionId, Number(asObject(afterRemoval.subscription).id)));
    assert.equal(storedPause.endsOn, yesterday);
    assert.equal(storedPause.cancelledAt, null);
    assert.equal(storedPause.revision, 2, "ending early is a new change");
    assert.equal((await storedSubscription(coachA, client))?.revision, 2);

    assertError(await deletePause(coachA, client), 409, "Pause has already ended");
    assertError(
      await postPause(coachA, client, { startsOn: addDays(today, -3), endsOn: addDays(today, 2) }),
      409,
      "Pause overlaps another pause",
    );
  });

  it("pause: a running pause after a payment cannot be removed", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("pause-then-pay", inviteCodeA);
    await createSubscription(coachA, client, {
      offerId: monthlyOfferId,
      startedOn: addDays(today, -20),
      paidThrough: addDays(today, 5),
    });
    assertStatus(
      await postPause(coachA, client, { startsOn: addDays(today, -2), endsOn: addDays(today, 3) }),
      201,
    );
    await recordPayment(coachA, client, { amountCents: 8000, paidOn: today, method: "cash" });

    assert.equal(asObject((await readDetail(coachA, client)).activePause).canRemove, false);
    assertError(await deletePause(coachA, client), 409, "Only the latest change can be undone");
  });

  // --- Start date ---------------------------------------------------------------------------

  // Contract (Ordine delle operazioni): a new startedOn moves the revision, otherwise undoing an
  // earlier payment could put paidThrough before the new start and break the check constraint.
  it("subscription: a new startedOn blocks undoing earlier changes (409, never 500); the same startedOn does not", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("moved-start", inviteCodeA);
    const startedOn = addDays(today, -10);
    await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn });
    const payment = { amountCents: 8000, paidOn: today, method: "cash", start: "paid_through" };

    const first = await recordPayment(coachA, client, payment);
    const sameStart = await putSubscription(coachA, client, { startedOn, agreedPriceCents: 7000 });
    assertStatus(sameStart, 200);
    assert.equal(asObject(asObject(sameStart.body).subscription).agreedPriceCents, 7000);
    assert.equal((await readPayments(coachA, client))[0].canUndo, true, "the same startedOn changes nothing");
    assert.equal((await storedSubscription(coachA, client))?.revision, 1);
    assertStatus(await deletePayment(coachA, client, asObject(first.payment).id), 204);

    const second = await recordPayment(coachA, client, payment);
    const paidThrough = addMonths(startedOn, 1, dayOf(startedOn));
    assert.equal(asObject(second.subscription).paidThrough, paidThrough);
    const laterStart = addDays(startedOn, 3);
    const moved = await putSubscription(coachA, client, { startedOn: laterStart });
    assertStatus(moved, 200);
    assert.equal(asObject(asObject(moved.body).subscription).startedOn, laterStart);
    assert.equal((await readPayments(coachA, client))[0].canUndo, false);
    assertError(
      await deletePayment(coachA, client, asObject(second.payment).id),
      409,
      "Only the latest change can be undone",
    );
    const afterRefusal = await readSubscription(coachA, client);
    assert.deepEqual([afterRefusal.startedOn, afterRefusal.paidThrough], [laterStart, paidThrough]);

    const pause = await postPause(coachA, client, {
      startsOn: addDays(today, 5),
      endsOn: addDays(today, 9),
    });
    assertStatus(pause, 201);
    assert.equal(asObject(asObject(pause.body).pause).canRemove, true);
    const pauseId = asObject(asObject(pause.body).pause).id;
    assertStatus(await putSubscription(coachA, client, { startedOn: addDays(laterStart, 2) }), 200);
    assert.equal(asObject((await readDetail(coachA, client)).activePause).canRemove, false);
    assertError(await deletePause(coachA, client), 409, "Only the latest change can be undone");
    assert.equal(asObject((await readDetail(coachA, client)).activePause).id, pauseId, "the pause stays");
    assert.equal((await storedSubscription(coachA, client))?.revision, 4);
  });

  // --- Bodies -------------------------------------------------------------------------------

  // Contract: a body that is not a JSON object (absent, null, array, primitive) is 400, never 500.
  it("bodies: JSON null or a primitive is 400 Invalid request body", async () => {
    const { coachA, mainClient } = setup();
    const writes = [
      (body: unknown) => api("POST", "/api/coach/offers", { token: coachA.token, body }),
      (body: unknown) => putSubscription(coachA, mainClient, body),
      (body: unknown) => postPayment(coachA, mainClient, body),
      (body: unknown) => postPause(coachA, mainClient, body),
    ];
    const results = await Promise.all(
      writes.flatMap((write) =>
        [null, "text", 5].map(async (body) => ({ body, response: await write(body) })),
      ),
    );
    const wrong = results
      .filter(({ response }) => response.status !== 400)
      .map(({ body, response }) => `${JSON.stringify(body)} -> ${failMessage(response)}`);
    assert.deepEqual(wrong, []);
    results.forEach(({ response }) => assertError(response, 400, "Invalid request body"));
  });

  // Contract (F2): what the JSON parser rejects is a client error for every route, and the log
  // keeps only type and status, never the body (a password sent to /auth/login).
  it("bodies: malformed, too large or oddly encoded JSON is a 4xx on R2 and on login, never logged", async () => {
    const { coachA, mainClient } = setup();
    const password = `never-logged-${uniqueSuffix()}`;
    const logged = mock.method(console, "error", () => {});

    try {
      assertError(
        await sendRawBody("POST", clientPath(mainClient, "/payments"), '{"amountCents": 1,', {
          token: coachA.token,
        }),
        400,
        "Invalid request body",
      );
      assertError(
        await sendRawBody("PUT", clientPath(mainClient, "/subscription"), "{endedOn: null}", {
          token: coachA.token,
        }),
        400,
        "Invalid request body",
      );
      assertError(
        await sendRawBody(
          "POST",
          "/api/auth/login",
          `{"email": "someone@example.com", "password": ${password}}`,
        ),
        400,
        "Invalid request body",
      );
      assertError(
        await sendRawBody(
          "POST",
          "/api/coach/offers",
          JSON.stringify({ name: "x".repeat(200_000), password }),
          { token: coachA.token },
        ),
        413,
        "Request body too large",
      );
      assertError(
        await sendRawBody("POST", "/api/auth/login", JSON.stringify({ password }), {
          contentEncoding: "compress",
        }),
        415,
        "Unsupported request body encoding",
      );
    } finally {
      logged.mock.restore();
    }

    const logLines = logged.mock.calls.map((call) => JSON.stringify(call.arguments));
    assert.ok(logLines.length >= 5, "each rejected body is logged once");
    assert.deepEqual(
      logLines.filter((line) => line.includes(password) || line.includes("someone@example.com")),
      [],
      "the log never holds the body",
    );
    assert.deepEqual(
      logged.mock.calls.map((call) => Object.keys(asObject(call.arguments[0])).sort()),
      logged.mock.calls.map(() => ["status", "type"]),
    );
  });

  // --- Permissions --------------------------------------------------------------------------

  it("permissions: 401 without token, 403 for athletes, 404 for another coach and no writes", async () => {
    const { coachA, coachB, inviteCodeB, mainClient, monthlyOfferId, offerOfCoachBId } = setup();

    assertStatus(await api("GET", "/api/coach/offers"), 401);
    assertStatus(await api("GET", clientPath(mainClient, "/subscription")), 401);
    assertStatus(
      await api("GET", clientPath(mainClient, "/subscription"), {
        token: mainClient.token,
        mobile: true,
      }),
      403,
    );
    assertStatus(
      await api("POST", "/api/coach/offers", {
        token: mainClient.token,
        mobile: true,
        body: { name: "x", priceCents: 1, periodUnit: "month", periodCount: 1 },
      }),
      403,
    );

    assertError(
      await api("GET", "/api/coach/clients/abc/subscription", { token: coachA.token }),
      400,
      "Invalid athlete id",
    );
    assertError(
      await api("GET", "/api/coach/clients/0/payments", { token: coachA.token }),
      400,
      "Invalid athlete id",
    );
    assertError(
      await api("DELETE", "/api/coach/clients/0/payments/abc", { token: coachA.token }),
      400,
      "Invalid athlete id",
    );

    const snapshotBefore = await readDetail(coachA, mainClient);
    const paymentsBefore = await readPayments(coachA, mainClient);
    const latestPaymentOfA = paymentsBefore.filter((payment) => payment.canUndo)[0];
    assert.ok(latestPaymentOfA, "main client has an undoable payment");

    const attempts: ApiResponse[] = [
      await api("GET", clientPath(mainClient, "/subscription"), { token: coachB.token }),
      await putSubscription(coachB, mainClient, { agreedPriceCents: 1 }),
      await api("GET", clientPath(mainClient, "/payments"), { token: coachB.token }),
      await preview(coachB, mainClient, `paidOn=${today}`),
      await postPayment(coachB, mainClient, { amountCents: 1, paidOn: today, method: "cash" }),
      await deletePayment(coachB, mainClient, latestPaymentOfA.id),
      await postPause(coachB, mainClient, { startsOn: addDays(today, 1), endsOn: addDays(today, 2) }),
      await deletePause(coachB, mainClient),
    ];
    attempts.forEach((attempt) => assertError(attempt, 404, "Client not found"));

    assert.deepEqual(await readDetail(coachA, mainClient), snapshotBefore, "coach B wrote nothing");
    assert.deepEqual(await readPayments(coachA, mainClient), paymentsBefore);

    // Coach B's own client: A's offer is "not found", A's payment id is "not found".
    const clientOfB = await newClient("client-of-b", inviteCodeB);
    assertError(
      await putSubscription(coachB, clientOfB, { offerId: monthlyOfferId, startedOn: today }),
      404,
      "Offer not found",
    );
    await createSubscription(coachB, clientOfB, { offerId: offerOfCoachBId, startedOn: today });
    assertError(
      await deletePayment(coachB, clientOfB, latestPaymentOfA.id),
      404,
      "Payment not found",
    );
    assert.deepEqual(await readPayments(coachA, mainClient), paymentsBefore);
  });

  // --- Unlink -------------------------------------------------------------------------------

  it("unlink by the coach ends the subscription; relinking shows it ended and PUT resumes it", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("unlinked", inviteCodeA);
    const created = await createSubscription(coachA, client, {
      offerId: monthlyOfferId,
      startedOn: addDays(today, -10),
    });
    const subscriptionId = asObject(created.subscription).id;

    const unlinked = await api("DELETE", `/api/coach/clients/${client.id}`, { token: coachA.token });
    assertStatus(unlinked, 200);

    // F1: an ex client keeps the reads; preview and every write need the link.
    const formerDetail = await readDetail(coachA, client);
    assert.equal(asObject(formerDetail.subscription).id, subscriptionId);
    assert.equal(asObject(formerDetail.subscription).endedOn, today);
    assert.equal(asObject(formerDetail.state).status, "ended");
    assert.deepEqual(await readPayments(coachA, client), []);

    const writes: ApiResponse[] = [
      await preview(coachA, client, `paidOn=${today}`),
      await postPayment(coachA, client, { amountCents: 1, paidOn: today, method: "cash" }),
      await deletePayment(coachA, client, 1),
      await postPause(coachA, client, { startsOn: addDays(today, 1), endsOn: addDays(today, 2) }),
      await deletePause(coachA, client),
      await putSubscription(coachA, client, { endedOn: null }),
    ];
    writes.forEach((write) => assertError(write, 404, "Client not found"));

    const stored = await storedSubscription(coachA, client);
    assert.equal(stored?.endedOn, today, "unlinking ends the subscription today");
    assert.equal(stored?.revision, 0, "unlinking does not move the revision");

    await linkToCoach(client, inviteCodeA);
    const relinked = await readDetail(coachA, client);
    assert.equal(asObject(relinked.subscription).id, subscriptionId);
    assert.equal(asObject(relinked.subscription).endedOn, today);
    assert.equal(asObject(relinked.state).status, "ended");

    const resumed = await putSubscription(coachA, client, { endedOn: null });
    assertStatus(resumed, 200);
    assert.equal(asObject(asObject(resumed.body).subscription).id, subscriptionId);
    assert.equal(asObject(asObject(resumed.body).subscription).endedOn, null);
  });

  it("unlink: an ex client keeps the payment history and pause, nothing undoable or removable", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const startedOn = addDays(today, -10);

    const payingClient = await newClient("former-paying", inviteCodeA);
    await createSubscription(coachA, payingClient, { offerId: monthlyOfferId, startedOn });
    const first = await recordPayment(coachA, payingClient, {
      amountCents: 8000,
      paidOn: addDays(today, -5),
      method: "cash",
      start: "paid_through",
    });
    const second = await recordPayment(coachA, payingClient, {
      amountCents: 8000,
      paidOn: today,
      method: "bank_transfer",
      start: "paid_through",
    });
    const paymentsBefore = await readPayments(coachA, payingClient);
    assert.deepEqual(
      paymentsBefore.map((payment) => [payment.id, payment.canUndo]),
      [
        [asObject(second.payment).id, true],
        [asObject(first.payment).id, false],
      ],
    );
    const paidThroughBefore = (await readSubscription(coachA, payingClient)).paidThrough;

    const pausedClient = await newClient("former-paused", inviteCodeA);
    await createSubscription(coachA, pausedClient, { offerId: monthlyOfferId, startedOn });
    const pauseStart = addDays(today, 3);
    const pauseEnd = addDays(today, 6);
    assertStatus(await postPause(coachA, pausedClient, { startsOn: pauseStart, endsOn: pauseEnd }), 201);
    assert.equal(asObject((await readDetail(coachA, pausedClient)).activePause).canRemove, true);

    assertStatus(await api("DELETE", `/api/coach/clients/${payingClient.id}`, { token: coachA.token }), 200);
    assertStatus(await api("DELETE", "/api/athlete/coach", { token: pausedClient.token, mobile: true }), 200);

    const paymentsAfter = await readPayments(coachA, payingClient);
    paymentsAfter.forEach((payment) => assertKeys(payment, PAYMENT_KEYS));
    assert.deepEqual(
      paymentsAfter,
      paymentsBefore.map((payment) => ({ ...payment, canUndo: false })),
      "same history, nothing undoable",
    );
    const payingDetail = await readDetail(coachA, payingClient);
    assert.equal(asObject(payingDetail.state).status, "ended");
    assert.equal(asObject(payingDetail.subscription).paidThrough, paidThroughBefore);
    assertError(
      await deletePayment(coachA, payingClient, asObject(second.payment).id),
      404,
      "Client not found",
    );

    const pausedDetail = await readDetail(coachA, pausedClient);
    assert.equal(asObject(pausedDetail.state).status, "ended");
    const pauseAfter = asObject(pausedDetail.activePause);
    assertKeys(pauseAfter, PAUSE_KEYS);
    assert.deepEqual([pauseAfter.startsOn, pauseAfter.endsOn, pauseAfter.canRemove], [pauseStart, pauseEnd, false]);
  });

  it("unlink: an ex client who never had a subscription is not found", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("former-never-subscribed", inviteCodeA);
    assert.deepEqual(await readDetail(coachA, client), {
      subscription: null,
      state: null,
      activePause: null,
    });

    assertStatus(await api("DELETE", `/api/coach/clients/${client.id}`, { token: coachA.token }), 200);

    assertError(
      await api("GET", clientPath(client, "/subscription"), { token: coachA.token }),
      404,
      "Client not found",
    );
    assertError(
      await api("GET", clientPath(client, "/payments"), { token: coachA.token }),
      404,
      "Client not found",
    );
  });

  // Contract (Scollegamento): until startedOn the state is not "ended" yet, but an ex client's
  // writes are 404, so nothing reads as undoable or removable.
  it("unlink of a subscription that starts later: ends on its start date, not ended yet, nothing undoable or removable", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const startedOn = addDays(today, 10);

    const payingClient = await newClient("unlinked-future", inviteCodeA);
    await createSubscription(coachA, payingClient, { offerId: monthlyOfferId, startedOn });
    const paid = await recordPayment(coachA, payingClient, {
      amountCents: 8000,
      paidOn: today,
      method: "cash",
      start: "paid_through",
    });
    assert.equal((await readPayments(coachA, payingClient))[0].canUndo, true);

    const pausedClient = await newClient("unlinked-future-paused", inviteCodeA);
    await createSubscription(coachA, pausedClient, { offerId: monthlyOfferId, startedOn });
    assertStatus(
      await postPause(coachA, pausedClient, { startsOn: addDays(today, 12), endsOn: addDays(today, 15) }),
      201,
    );
    assert.equal(asObject((await readDetail(coachA, pausedClient)).activePause).canRemove, true);

    assertStatus(await api("DELETE", "/api/athlete/coach", { token: payingClient.token, mobile: true }), 200);
    assertStatus(await api("DELETE", `/api/coach/clients/${pausedClient.id}`, { token: coachA.token }), 200);

    const stored = await storedSubscription(coachA, payingClient);
    assert.equal(stored?.endedOn, startedOn, "endedOn cannot precede startedOn");
    assert.notEqual(asObject((await readDetail(coachA, payingClient)).state).status, "ended");
    const payments = await readPayments(coachA, payingClient);
    assert.deepEqual(
      payments.map((payment) => [payment.id, payment.canUndo]),
      [[asObject(paid.payment).id, false]],
    );
    assertError(
      await deletePayment(coachA, payingClient, asObject(paid.payment).id),
      404,
      "Client not found",
    );

    const pausedDetail = await readDetail(coachA, pausedClient);
    assert.equal(asObject(pausedDetail.subscription).endedOn, startedOn);
    assert.notEqual(asObject(pausedDetail.state).status, "ended");
    assert.equal(asObject(pausedDetail.activePause).canRemove, false);
    assertError(await deletePause(coachA, pausedClient), 404, "Client not found");
  });

  // --- Concurrency --------------------------------------------------------------------------

  it("concurrency: two payments at once both count", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("parallel-payments", inviteCodeA);
    const startedOn = addDays(today, -10);
    await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn });

    const body = { amountCents: 8000, paidOn: today, method: "cash", start: "paid_through" };
    const responses = await Promise.all([
      postPayment(coachA, client, body),
      postPayment(coachA, client, body),
    ]);
    responses.forEach((response) => assertStatus(response, 201));

    const first = addMonths(startedOn, 1, dayOf(startedOn));
    const second = addMonths(startedOn, 2, dayOf(startedOn));
    assert.deepEqual(
      responses.map((response) => asObject(asObject(response.body).payment).coversFrom).sort(),
      [startedOn, first].sort(),
    );
    assert.equal((await readSubscription(coachA, client)).paidThrough, second);

    const payments = await readPayments(coachA, client);
    const highestId = Math.max(...payments.map((payment) => Number(payment.id)));
    assert.deepEqual(
      payments.filter((payment) => payment.canUndo).map((payment) => payment.id),
      [highestId],
    );
    assert.equal((await storedSubscription(coachA, client))?.revision, 2);
  });

  it("concurrency: two creations at once give one 201 and one 409, never 500", async () => {
    const { coachA, inviteCodeA, monthlyOfferId } = setup();
    const client = await newClient("parallel-create", inviteCodeA);
    const body = { offerId: monthlyOfferId, startedOn: today };

    const responses = await Promise.all([
      putSubscription(coachA, client, body),
      putSubscription(coachA, client, body),
    ]);
    const statuses = responses.map((response) => response.status).sort();
    assert.deepEqual(statuses, [201, 409], responses.map(failMessage).join(" | "));
    const conflict = responses.find((response) => response.status === 409);
    assert.deepEqual(conflict?.body, { error: "Subscription already exists" });
  });

  it("concurrency: a creation blocked behind another uncommitted creation gets 409", async () => {
    const { coachA, inviteCodeA, monthlyOfferId, database, schema } = setup();
    const client = await newClient("blocked-create", inviteCodeA);
    const inserted = deferred();
    const released = deferred();

    // Holds an uncommitted row for the pair, so the PUT finds nothing to lock and waits on the unique index.
    const holder = database.db.transaction(async (tx) => {
      await tx.insert(schema.clientSubscriptions).values({
        coachId: coachA.id,
        athleteId: client.id,
        offerId: monthlyOfferId,
        agreedPriceCents: 8000,
        periodUnit: "month",
        periodCount: 1,
        isRecurring: true,
        startedOn: today,
        paidThrough: today,
        billingDay: dayOf(today),
      });
      inserted.resolve();
      await released.promise;
    });
    await inserted.promise;

    const blockedPut = putSubscription(coachA, client, { offerId: monthlyOfferId, startedOn: today });
    await waitForLockWait('%insert into "client_subscriptions"%');

    released.resolve();
    await holder;
    assertError(await blockedPut, 409, "Subscription already exists");
  });

  it("concurrency: a resume that arrives while the unlink holds the link finds no client", async () => {
    const { coachA, inviteCodeA, monthlyOfferId, database, schema } = setup();
    const client = await newClient("unlink-vs-resume", inviteCodeA);
    await createSubscription(coachA, client, { offerId: monthlyOfferId, startedOn: addDays(today, -40) });
    const ended = await putSubscription(coachA, client, { endedOn: addDays(today, -1) });
    assertStatus(ended, 200);
    const locked = deferred();
    const released = deferred();

    // Holds the subscription row, so the unlink stops after locking the link and before ending it.
    const holder = database.db.transaction(async (tx) => {
      await tx
        .select({ id: schema.clientSubscriptions.id })
        .from(schema.clientSubscriptions)
        .where(
          and(
            eq(schema.clientSubscriptions.coachId, coachA.id),
            eq(schema.clientSubscriptions.athleteId, client.id),
          ),
        )
        .for("update");
      locked.resolve();
      await released.promise;
    });
    await locked.promise;

    const unlink = api("DELETE", `/api/coach/clients/${client.id}`, { token: coachA.token });
    await waitForLockWait('%from "client_subscriptions"%for update%');

    // Whatever it waits on (the link now; before F3, the subscription after an unlocked look at
    // the link), the resume must not reopen the subscription once the unlink commits.
    const resume = putSubscription(coachA, client, { endedOn: null });
    await waitForLockWait("%select % for %", 2);

    released.resolve();
    await holder;
    assertStatus(await unlink, 200);
    assertError(await resume, 404, "Client not found");

    const stored = await storedSubscription(coachA, client);
    assert.equal(stored?.endedOn, addDays(today, -1), "never reopened for an ex client");
    assert.equal(asObject((await readDetail(coachA, client)).state).status, "ended");
  });
});

import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;
type ApiResponse = { status: number; body: unknown };
type Account = { id: number; token: string };
type DatabaseModule = typeof import("../db");

/** A coach of one test, with a monthly offer (80 €) and a 12-week offer (300 €). */
type CoachSetup = { coach: Account; inviteCode: string; monthlyOfferId: number; twelveWeekOfferId: number };

const PASSWORD = "smoketest-password";

// Field list of the contract (docs/contracts/pt-business.md): nothing more, nothing less.
const BUSINESS_KEYS = [
  "collectedByMonth",
  "expectedNext30DaysCents",
  "lostByMonth",
  "monthlyRecurringCents",
  "range",
  "recurringClientCount",
  "renewals90Days",
  "subscriptionCount",
  "today",
];

const today = todayInRome();

// Expected dates are computed here, by hand, not with the code under test.
const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/** `count` months ending with the current one, oldest first. */
const monthsUntilToday = (count: number): string[] => {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, month - count + index, 1)).toISOString().slice(0, 7),
  );
};

const currentMonth = today.slice(0, 7);

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

const failMessage = (response: ApiResponse): string =>
  `status ${response.status}: ${JSON.stringify(response.body)}`;

const assertStatus = (response: ApiResponse, status: number): void => {
  assert.equal(response.status, status, failMessage(response));
};

const assertError = (response: ApiResponse, status: number, error: string): void => {
  assertStatus(response, status);
  assert.deepEqual(response.body, { error });
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

describe("PT business smoke (R8)", { concurrency: false }, () => {
  let server: Server | undefined;
  let baseUrl = "";
  let database: DatabaseModule | undefined;

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

  const register = async (label: string, isAthlete: boolean): Promise<Account> => {
    const registered = await api("POST", "/api/auth/register", {
      mobile: isAthlete,
      body: { email: `business.${label}.${uniqueSuffix()}@example.com`, password: PASSWORD, name: `Business ${label}` },
    });
    assertStatus(registered, 201);
    const payload = asObject(registered.body);
    const user = asObject(payload.user);
    return { id: Number(user.id), token: String(payload.accessToken) };
  };

  const createOffer = async (coach: Account, body: JsonObject): Promise<number> => {
    const offer = await api("POST", "/api/coach/offers", { token: coach.token, body });
    assertStatus(offer, 201);
    return Number(asObject(offer.body).id);
  };

  /** Every test that counts has its own coach, so earlier tests add nothing. */
  const newCoach = async (label: string): Promise<CoachSetup> => {
    const coach = await register(label, false);
    const invite = await api("GET", "/api/coach/invite-code", { token: coach.token });
    assertStatus(invite, 200);
    return {
      coach,
      inviteCode: String(asObject(invite.body).code),
      monthlyOfferId: await createOffer(coach, {
        name: "Coaching mensile",
        priceCents: 8000,
        periodUnit: "month",
        periodCount: 1,
      }),
      twelveWeekOfferId: await createOffer(coach, {
        name: "Percorso 12 settimane",
        priceCents: 30000,
        periodUnit: "week",
        periodCount: 12,
      }),
    };
  };

  const newClient = async (label: string, coachSetup: CoachSetup): Promise<Account> => {
    const athlete = await register(label, true);
    const linked = await api("POST", "/api/athlete/coach/link", {
      token: athlete.token,
      mobile: true,
      body: { code: coachSetup.inviteCode },
    });
    assertStatus(linked, 201);
    return athlete;
  };

  const clientPath = (athlete: Account, rest: string): string => `/api/coach/clients/${athlete.id}${rest}`;

  const createSubscription = async (
    coachSetup: CoachSetup,
    athlete: Account,
    body: { offerId: number; startedOn: string; paidThrough: string; agreedPriceCents?: number },
  ): Promise<void> => {
    const created = await api("PUT", clientPath(athlete, "/subscription"), { token: coachSetup.coach.token, body });
    assertStatus(created, 201);
  };

  const recordPayment = async (coach: Account, athlete: Account, amountCents: number): Promise<number> => {
    const recorded = await api("POST", clientPath(athlete, "/payments"), {
      token: coach.token,
      body: { amountCents, paidOn: today, method: "cash" },
    });
    assertStatus(recorded, 201);
    return Number(asObject(asObject(recorded.body).payment).id);
  };

  const readBusiness = async (coach: Account, query = ""): Promise<JsonObject> => {
    const read = await api("GET", `/api/coach/business${query}`, { token: coach.token });
    assertStatus(read, 200);
    assert.deepEqual(Object.keys(asObject(read.body)).sort(), BUSINESS_KEYS);
    return asObject(read.body);
  };

  const collectedIn = (business: JsonObject, month: string): unknown =>
    (business.collectedByMonth as JsonObject[]).find((entry) => entry.month === month)?.amountCents;

  const lostIn = (business: JsonObject, month: string): unknown =>
    (business.lostByMonth as JsonObject[]).find((entry) => entry.month === month)?.count;

  before(async () => {
    requireScratchDatabase();

    const [{ app }, databaseModule] = await Promise.all([import("../app"), import("../db")]);

    server = app.listen(0);
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    database = databaseModule;
  });

  after(async () => {
    if (server) {
      const httpServer = server;
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
        httpServer.closeAllConnections();
      });
    }

    if (database) {
      await database.closeDb();
    }
  });

  it("permissions: 401 without a token, 403 for an athlete", async () => {
    const athlete = await register("athlete-permissions", true);
    assertStatus(await api("GET", "/api/coach/business"), 401);
    assertStatus(await api("GET", "/api/coach/business", { token: athlete.token, mobile: true }), 403);
  });

  it("range: absent is 6m, 12m works, any other value is 400", async () => {
    const { coach } = await newCoach("coach-range");

    const byDefault = await readBusiness(coach);
    assert.equal(byDefault.range, "6m");
    assert.equal(byDefault.today, today);
    assert.deepEqual(
      (byDefault.collectedByMonth as JsonObject[]).map((entry) => entry.month),
      monthsUntilToday(6),
    );

    const yearly = await readBusiness(coach, "?range=12m");
    assert.equal(yearly.range, "12m");
    assert.deepEqual((yearly.lostByMonth as JsonObject[]).map((entry) => entry.month), monthsUntilToday(12));

    for (const query of ["?range=3m", "?range=", "?range=6M", "?range=6m&range=12m"]) {
      assertError(
        await api("GET", `/api/coach/business${query}`, { token: coach.token }),
        400,
        "range must be 6m or 12m",
      );
    }
  });

  it("empty: a coach without subscriptions gets zeros on every month, current month included", async () => {
    const { coach } = await newCoach("coach-empty");
    const business = await readBusiness(coach);
    assert.deepEqual(business, {
      range: "6m",
      today,
      subscriptionCount: 0,
      monthlyRecurringCents: 0,
      recurringClientCount: 0,
      expectedNext30DaysCents: 0,
      collectedByMonth: monthsUntilToday(6).map((month) => ({ month, amountCents: 0 })),
      renewals90Days: { due: 0, renewed: 0 },
      lostByMonth: monthsUntilToday(6).map((month) => ({ month, count: 0 })),
    });
  });

  it("numbers: pause and ended stay out, undone payments vanish, an unlinked client is lost, two coaches stay apart", async () => {
    const coachA = await newCoach("coach-a");
    const coachB = await newCoach("coach-b");

    // Renewed: paid 15 days ago until today − 15, renews today from there (a renewal in the window).
    const renewing = await newClient("renewing", coachA);
    await createSubscription(coachA, renewing, {
      offerId: coachA.monthlyOfferId,
      startedOn: addDays(today, -45),
      paidThrough: addDays(today, -15),
    });
    await recordPayment(coachA.coach, renewing, 8000);

    // 12 weeks at 300 €: 30000 × 52 / 12 / 12 = 10833.33 → 10833 a month; next renewal beyond 30 days.
    const twelveWeeks = await newClient("twelve-weeks", coachA);
    await createSubscription(coachA, twelveWeeks, {
      offerId: coachA.twelveWeekOfferId,
      startedOn: today,
      paidThrough: addDays(today, 40),
    });

    // Expired 3 days ago: still recurring income, a missed renewal, not expected.
    const expired = await newClient("expired", coachA);
    await createSubscription(coachA, expired, {
      offerId: coachA.monthlyOfferId,
      startedOn: addDays(today, -60),
      paidThrough: addDays(today, -3),
    });

    // Paused since yesterday: out of recurring and expected.
    const paused = await newClient("paused", coachA);
    await createSubscription(coachA, paused, {
      offerId: coachA.monthlyOfferId,
      startedOn: addDays(today, -10),
      paidThrough: addDays(today, 20),
    });
    const pause = await api("POST", clientPath(paused, "/pause"), {
      token: coachA.coach.token,
      body: { startsOn: addDays(today, -1), endsOn: addDays(today, 5) },
    });
    assertStatus(pause, 201);

    // Pays 50 € today, then is unlinked: lost this month, the payment stays collected.
    const leaving = await newClient("leaving", coachA);
    await createSubscription(coachA, leaving, {
      offerId: coachA.monthlyOfferId,
      startedOn: addDays(today, -30),
      paidThrough: addDays(today, 5),
    });
    await recordPayment(coachA.coach, leaving, 5000);
    assertStatus(await api("DELETE", `/api/coach/clients/${leaving.id}`, { token: coachA.coach.token }), 200);

    // Coach B: one client at 99 €, paid today. Never seen by coach A.
    const otherClient = await newClient("other", coachB);
    await createSubscription(coachB, otherClient, {
      offerId: coachB.monthlyOfferId,
      startedOn: addDays(today, -5),
      paidThrough: addDays(today, -5),
      agreedPriceCents: 9900,
    });
    await recordPayment(coachB.coach, otherClient, 9900);

    // A payment recorded by mistake and undone (DELETE) is not collected.
    const mistakeId = await recordPayment(coachA.coach, renewing, 8000);
    assert.equal(collectedIn(await readBusiness(coachA.coach), currentMonth), 8000 + 5000 + 8000);
    assertStatus(await api("DELETE", clientPath(renewing, `/payments/${mistakeId}`), { token: coachA.coach.token }), 204);

    const businessA = await readBusiness(coachA.coach);
    assert.equal(businessA.subscriptionCount, 5);
    assert.equal(businessA.monthlyRecurringCents, 8000 + 10833 + 8000, "renewing + 12 weeks + expired");
    assert.equal(businessA.recurringClientCount, 3);
    // Only the renewing client: it is now paid until about today + 15, inside the 30 days.
    assert.equal(businessA.expectedNext30DaysCents, 8000);
    assert.equal(collectedIn(businessA, currentMonth), 8000 + 5000, "the undone payment is gone");
    assert.deepEqual(businessA.renewals90Days, { due: 2, renewed: 1 }, "renewing paid, expired missed");
    assert.equal(lostIn(businessA, currentMonth), 1, "the unlinked client is lost");

    const businessB = await readBusiness(coachB.coach);
    assert.equal(businessB.subscriptionCount, 1);
    assert.equal(businessB.monthlyRecurringCents, 9900);
    assert.equal(businessB.recurringClientCount, 1);
    assert.equal(collectedIn(businessB, currentMonth), 9900);
    // B's first payment is not a renewal; B lost nobody.
    assert.deepEqual(businessB.renewals90Days, { due: 0, renewed: 0 });
    assert.equal(lostIn(businessB, currentMonth), 0);
  });
});

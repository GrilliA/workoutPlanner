import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { and, eq } from "drizzle-orm";
import { todayInRome } from "../services/assignmentStatus";
import { validateMealPlanInput } from "../services/mealPlanValidation";

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
};

const PASSWORD = "smoketest-password";

// express.json() default limit ("100kb" in the bytes package): 102400 bytes of raw body.
const JSON_BODY_LIMIT_BYTES = 100 * 1024;

// Field lists of the contract (docs/contracts/al-piano-pasti.md): internal columns must not leak.
const MEAL_PLAN_KEYS = ["athleteId", "createdAt", "id", "isActive", "meals", "notes", "updatedAt"];
const MEAL_KEYS = ["id", "items", "name", "notes", "position", "timeOfDay"];
const ITEM_KEYS = ["food", "id", "position", "quantity"];
const DAY_KEYS = ["date", "doneCount", "mealCount", "otherCount", "removedCount"];

// Expected dates are computed here, by hand, not with the code under test.
const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
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

/** A plan with every count and every text at its cap, each text one character repeated. */
const planAtTheLimits = (char: string) => {
  // Lengths are UTF-16 units: an emoji counts 2, so it is repeated half as many times.
  const text = (units: number) => char.repeat(units / char.length);
  return {
    notes: text(1000),
    meals: Array.from({ length: 12 }, () => ({
      name: text(60),
      timeOfDay: "12:00",
      notes: text(500),
      items: Array.from({ length: 30 }, () => ({ food: text(120), quantity: text(60) })),
    })),
  };
};

const bodyBytes = (body: unknown): number => Buffer.byteLength(JSON.stringify(body), "utf8");

const mealsOf = (plan: unknown): JsonObject[] => asList(asObject(plan).meals);
const itemsOf = (meal: JsonObject): JsonObject[] => asList(meal.items);

const breakfastAndLunch = {
  notes: "Bevi due litri d'acqua",
  meals: [
    {
      name: "Colazione",
      timeOfDay: "07:30",
      items: [
        { food: "Avena", quantity: "80 g" },
        { food: "Latte", quantity: "200 ml" },
      ],
    },
    { name: "Pranzo", timeOfDay: "13:00", notes: "Verdure a volontà", items: [{ food: "Riso" }] },
  ],
};

describe("Meal plan coach API smoke", { concurrency: false }, () => {
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

  const register = async (label: string, isAthlete: boolean): Promise<Account> => {
    const registered = await api("POST", "/api/auth/register", {
      mobile: isAthlete,
      body: {
        email: `mealplan.${label}.${uniqueSuffix()}@example.com`,
        password: PASSWORD,
        name: `Pasti ${label}`,
      },
    });
    assertStatus(registered, 201);
    const payload = asObject(registered.body);
    const user = asObject(payload.user);
    return { id: Number(user.id), token: String(payload.accessToken) };
  };

  const inviteCodeOf = async (coach: Account): Promise<string> => {
    const invite = await api("GET", "/api/coach/invite-code", { token: coach.token });
    assertStatus(invite, 200);
    return String(asObject(invite.body).code);
  };

  const newClient = async (label: string, inviteCode: string): Promise<Account> => {
    const athlete = await register(label, true);
    const linked = await api("POST", "/api/athlete/coach/link", {
      token: athlete.token,
      mobile: true,
      body: { code: inviteCode },
    });
    assertStatus(linked, 201);
    return athlete;
  };

  const planPath = (athleteId: number | string): string => `/api/coach/clients/${athleteId}/meal-plan`;
  const logsPath = (athleteId: number | string, query: string): string =>
    `/api/coach/clients/${athleteId}/meal-logs?${query}`;

  const getPlan = (coach: Account, athlete: Account) => api("GET", planPath(athlete.id), { token: coach.token });
  const putPlan = (coach: Account, athlete: Account, body: unknown) =>
    api("PUT", planPath(athlete.id), { token: coach.token, body });
  const patchPlan = (coach: Account, athlete: Account, body: unknown) =>
    api("PATCH", planPath(athlete.id), { token: coach.token, body });
  const getLogs = (coach: Account, athlete: Account, query: string) =>
    api("GET", logsPath(athlete.id, query), { token: coach.token });

  const createPlan = async (coach: Account, athlete: Account, body: unknown): Promise<JsonObject> => {
    const created = await putPlan(coach, athlete, body);
    assertStatus(created, 201);
    return asObject(created.body);
  };

  /** The athlete API is AL4: logs are written straight to the table, as the athlete would. */
  const insertLog = async (
    athlete: Account,
    planId: number,
    meal: JsonObject,
    date: string,
    status: "done" | "other",
  ) => {
    const { database, schema } = setup();
    await database.db.insert(schema.mealLogs).values({
      athleteId: athlete.id,
      mealPlanId: planId,
      mealId: Number(meal.id),
      mealName: String(meal.name),
      date,
      status,
    });
  };

  const storedLogs = async (planId: number) => {
    const { database, schema } = setup();
    return database.db
      .select({ mealId: schema.mealLogs.mealId, mealName: schema.mealLogs.mealName })
      .from(schema.mealLogs)
      .where(eq(schema.mealLogs.mealPlanId, planId));
  };

  const storedPlanCount = async (coach: Account, athlete: Account): Promise<number> => {
    const { database, schema } = setup();
    const rows = await database.db
      .select({ id: schema.mealPlans.id })
      .from(schema.mealPlans)
      .where(and(eq(schema.mealPlans.coachId, coach.id), eq(schema.mealPlans.athleteId, athlete.id)));
    return rows.length;
  };

  const unlink = (coach: Account, athlete: Account) =>
    api("DELETE", `/api/coach/clients/${athlete.id}`, { token: coach.token });

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

    fixtures = {
      database,
      schema,
      coachA,
      coachB,
      inviteCodeA: await inviteCodeOf(coachA),
      inviteCodeB: await inviteCodeOf(coachB),
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

  // AC1, AC2
  it("GET is null before the first PUT; the first PUT creates an active plan, the next ones update", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("create", inviteCodeA);

    const empty = await getPlan(coachA, client);
    assertStatus(empty, 200);
    assert.deepEqual(empty.body, { mealPlan: null });

    const created = await createPlan(coachA, client, breakfastAndLunch);
    assertKeys(created, MEAL_PLAN_KEYS);
    assert.equal(created.athleteId, client.id);
    assert.equal(created.isActive, true);
    assert.equal(created.notes, "Bevi due litri d'acqua");
    const [breakfast, lunch] = mealsOf(created);
    assertKeys(breakfast, MEAL_KEYS);
    assertKeys(itemsOf(breakfast)[0], ITEM_KEYS);
    assert.deepEqual(
      mealsOf(created).map((meal) => [meal.name, meal.timeOfDay, meal.notes, meal.position]),
      [
        ["Colazione", "07:30", null, 0],
        ["Pranzo", "13:00", "Verdure a volontà", 1],
      ],
    );
    assert.deepEqual(
      itemsOf(breakfast).map((item) => [item.food, item.quantity, item.position]),
      [
        ["Avena", "80 g", 0],
        ["Latte", "200 ml", 1],
      ],
    );
    assert.deepEqual(itemsOf(lunch).map((item) => item.quantity), [null]);

    const read = await getPlan(coachA, client);
    assertStatus(read, 200);
    assert.deepEqual(asObject(read.body).mealPlan, created);

    // Timestamps have millisecond precision: wait so a fast PUT cannot land in the same millisecond.
    await sleep(5);
    const updated = await putPlan(coachA, client, { ...breakfastAndLunch, notes: null });
    assertStatus(updated, 200);
    assert.equal(asObject(updated.body).id, created.id);
    assert.equal(asObject(updated.body).createdAt, created.createdAt);
    assert.ok(
      Date.parse(String(asObject(updated.body).updatedAt)) > Date.parse(String(created.updatedAt)),
      "updatedAt moves on every PUT",
    );
    assert.equal(asObject(updated.body).notes, null);
    assert.equal(asObject(updated.body).isActive, true);
  });

  // AC3
  it("PUT keeps the ids it receives, removes the ones it does not, and logs keep the meal name", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("ids", inviteCodeA);
    const created = await createPlan(coachA, client, breakfastAndLunch);
    const planId = Number(created.id);
    const [breakfast, lunch] = mealsOf(created);
    const [oats, milk] = itemsOf(breakfast);
    await insertLog(client, planId, lunch, today, "done");
    await insertLog(client, planId, breakfast, today, "other");

    const saved = await putPlan(coachA, client, {
      meals: [
        { name: "Cena", items: [{ food: "Pesce", quantity: "150 g" }] },
        {
          id: breakfast.id,
          name: "Colazione grande",
          timeOfDay: null,
          items: [{ id: milk.id, food: "Latte di avena", quantity: "250 ml" }, { food: "Banana" }],
        },
      ],
    });

    assertStatus(saved, 200);
    const [dinner, breakfastAfter] = mealsOf(saved.body);
    assert.equal(dinner.name, "Cena");
    assert.equal(dinner.position, 0);
    assert.equal(breakfastAfter.id, breakfast.id);
    assert.equal(breakfastAfter.name, "Colazione grande");
    assert.equal(breakfastAfter.timeOfDay, null);
    assert.equal(breakfastAfter.position, 1);
    const itemsAfter = itemsOf(breakfastAfter);
    assert.equal(itemsAfter[0].id, milk.id);
    assert.equal(itemsAfter[0].food, "Latte di avena");
    assert.equal(itemsAfter[1].food, "Banana");
    assert.ok(!itemsAfter.some((item) => item.id === oats.id), "an item not sent is removed");
    assert.ok(!mealsOf(saved.body).some((meal) => meal.id === lunch.id), "a meal not sent is removed");

    const logs = await storedLogs(planId);
    assert.deepEqual(
      logs.map((log) => [log.mealId, log.mealName]).sort(),
      [
        [Number(breakfast.id), "Colazione"],
        [null, "Pranzo"],
      ].sort(),
    );

    const cleared = await putPlan(coachA, client, { meals: [] });
    assertStatus(cleared, 200);
    assert.deepEqual(mealsOf(cleared.body), []);
    assert.equal((await storedLogs(planId)).length, 2, "removing every meal keeps the logs");
  });

  // AC4, AC9
  it("refuses ids of another plan with 404 and never touches the other plan", async () => {
    const { coachA, coachB, inviteCodeA, inviteCodeB } = setup();
    const clientOfA = await newClient("own-a", inviteCodeA);
    const otherClientOfA = await newClient("other-a", inviteCodeA);
    const clientOfB = await newClient("own-b", inviteCodeB);
    const planOfA = await createPlan(coachA, clientOfA, breakfastAndLunch);
    const planOfB = await createPlan(coachB, clientOfB, breakfastAndLunch);
    const [mealOfB] = mealsOf(planOfB);
    const [itemOfB] = itemsOf(mealOfB);
    const [mealOfA, secondMealOfA] = mealsOf(planOfA);

    const otherCoachMeal = await putPlan(coachA, clientOfA, {
      meals: [{ id: mealOfB.id, name: "Rubato", items: [] }],
    });
    assertError(otherCoachMeal, 404, "Meal not found");

    const otherCoachItem = await putPlan(coachA, clientOfA, {
      meals: [{ id: mealOfA.id, name: "Colazione", items: [{ id: itemOfB.id, food: "Rubato" }] }],
    });
    assertError(otherCoachItem, 404, "Meal item not found");

    const itemOfOtherMeal = await putPlan(coachA, clientOfA, {
      meals: [{ id: secondMealOfA.id, name: "Pranzo", items: [{ id: itemsOf(mealOfA)[0].id, food: "Avena" }] }],
    });
    assertError(itemOfOtherMeal, 404, "Meal item not found");

    // Same coach, another client's plan: still a foreign id. The first PUT has no ids to update.
    const firstPutWithIds = await putPlan(coachA, otherClientOfA, {
      meals: [{ id: mealOfA.id, name: "Colazione", items: [] }],
    });
    assertError(firstPutWithIds, 404, "Meal not found");
    assert.deepEqual((await getPlan(coachA, otherClientOfA)).body, { mealPlan: null });

    const planOfBAfter = await getPlan(coachB, clientOfB);
    assert.deepEqual(asObject(planOfBAfter.body).mealPlan, planOfB);
    const planOfAAfter = await getPlan(coachA, clientOfA);
    assert.deepEqual(asObject(planOfAAfter.body).mealPlan, planOfA, "a refused PUT changes nothing");

    // AC9: coach B cannot read or write coach A's client at all.
    assertError(await getPlan(coachB, clientOfA), 404, "Client not found");
    assertError(await putPlan(coachB, clientOfA, { meals: [] }), 404, "Client not found");
    assertError(await patchPlan(coachB, clientOfA, { isActive: false }), 404, "Client not found");
    assertError(await getLogs(coachB, clientOfA, `from=${today}&to=${today}`), 404, "Client not found");
    assert.deepEqual(asObject((await getPlan(coachA, clientOfA)).body).mealPlan, planOfA);
  });

  // AC5
  it("PATCH turns the plan off and on, idempotently, without touching the meals", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("patch", inviteCodeA);

    assertError(await patchPlan(coachA, client, { isActive: false }), 404, "Meal plan not found");

    const created = await createPlan(coachA, client, breakfastAndLunch);

    const turnedOff = await patchPlan(coachA, client, { isActive: false });
    assertStatus(turnedOff, 200);
    assertKeys(turnedOff.body, MEAL_PLAN_KEYS);
    assert.equal(asObject(turnedOff.body).isActive, false);
    assert.deepEqual(mealsOf(turnedOff.body), mealsOf(created));

    const turnedOffAgain = await patchPlan(coachA, client, { isActive: false });
    assertStatus(turnedOffAgain, 200);
    assert.equal(asObject(turnedOffAgain.body).isActive, false);

    const readOff = await getPlan(coachA, client);
    assert.equal(asObject(asObject(readOff.body).mealPlan).isActive, false);

    const updatedWhileOff = await putPlan(coachA, client, breakfastAndLunch);
    assertStatus(updatedWhileOff, 200);
    assert.equal(asObject(updatedWhileOff.body).isActive, false, "PUT does not change isActive");

    const turnedOn = await patchPlan(coachA, client, { isActive: true });
    assertStatus(turnedOn, 200);
    assert.equal(asObject(turnedOn.body).isActive, true);

    assertError(await patchPlan(coachA, client, { isActive: "no" }), 400, "isActive must be a boolean");
    assertError(await patchPlan(coachA, client, [true]), 400, "Invalid request body");
  });

  // AC6
  it("answers 404 Client not found for an athlete not linked to the coach, and after unlinking", async () => {
    const { coachA, inviteCodeA } = setup();
    const stranger = await register("stranger", true);

    assertError(await getPlan(coachA, stranger), 404, "Client not found");
    assertError(await putPlan(coachA, stranger, breakfastAndLunch), 404, "Client not found");
    assertError(await patchPlan(coachA, stranger, { isActive: true }), 404, "Client not found");
    assertError(await getLogs(coachA, stranger, `from=${today}&to=${today}`), 404, "Client not found");
    assertError(await api("GET", planPath("abc"), { token: coachA.token }), 400, "Invalid athlete id");
    assertError(await api("GET", planPath(0), { token: coachA.token }), 400, "Invalid athlete id");

    // Only coaches: the athlete's own token is refused by the role check.
    const athleteCall = await api("GET", planPath(stranger.id), { token: stranger.token, mobile: true });
    assertStatus(athleteCall, 403);

    // Unlinking deletes the plan and its logs (H8).
    const leaving = await newClient("leaving", inviteCodeA);
    const created = await createPlan(coachA, leaving, breakfastAndLunch);
    await insertLog(leaving, Number(created.id), mealsOf(created)[0], today, "done");
    const unlinked = await api("DELETE", `/api/coach/clients/${leaving.id}`, { token: coachA.token });
    assertStatus(unlinked, 200);
    assertError(await getPlan(coachA, leaving), 404, "Client not found");
    assert.equal((await storedLogs(Number(created.id))).length, 0);
  });

  // AC7
  it("refuses bodies past the limits with 400", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("limits", inviteCodeA);
    const meal = { name: "Pasto", items: [{ food: "Cibo" }] };
    const thirteenMeals = Array.from({ length: 13 }, () => meal);
    const thirtyOneItems = Array.from({ length: 31 }, () => ({ food: "Cibo" }));

    const cases: [unknown, string][] = [
      [{ meals: thirteenMeals }, "meals must have at most 12 entries"],
      [{ meals: [{ name: "Pasto", items: thirtyOneItems }] }, "meals.items must have at most 30 entries"],
      [{ meals: [{ ...meal, name: "a".repeat(61) }] }, "meals.name must be at most 60 characters"],
      [{ meals: [{ name: "Pasto", items: [{ food: "a".repeat(121) }] }] }, "meals.items.food must be at most 120 characters"],
      [
        { meals: [{ name: "Pasto", items: [{ food: "Cibo", quantity: "a".repeat(61) }] }] },
        "meals.items.quantity must be at most 60 characters",
      ],
      [{ notes: "a".repeat(1001), meals: [] }, "notes must be at most 1000 characters"],
      [{ meals: [{ ...meal, notes: "a".repeat(501) }] }, "meals.notes must be at most 500 characters"],
      [{ meals: [{ ...meal, timeOfDay: "25:00" }] }, "meals.timeOfDay must be HH:MM or null"],
      [{ meals: [{ ...meal, name: "a\u0000b" }] }, "meals.name must not contain a NUL character"],
      [{ meals: [meal, { ...meal }].map((entry) => ({ ...entry, id: 5 })) }, "Duplicate meal id"],
      [
        { meals: [{ name: "Pasto", items: [{ id: 7, food: "Cibo" }, { id: 7, food: "Altro" }] }] },
        "Duplicate meal item id",
      ],
      [[], "Invalid request body"],
    ];

    for (const [body, error] of cases) {
      assertError(await putPlan(coachA, client, body), 400, error);
    }

    assert.deepEqual((await getPlan(coachA, client)).body, { mealPlan: null }, "nothing was stored");

    const atTheLimit = await putPlan(coachA, client, { meals: Array.from({ length: 12 }, () => meal) });
    assertStatus(atTheLimit, 201);
    assert.equal(mealsOf(atTheLimit.body).length, 12);
  });

  // AC8
  it("meal-logs returns one row per day, refuses more than 31 days and bad ranges", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("logs", inviteCodeA);
    const yesterday = addDays(today, -1);

    const noPlan = await getLogs(coachA, client, `from=${yesterday}&to=${today}`);
    assertStatus(noPlan, 200);
    assert.deepEqual(noPlan.body, {
      days: [
        { date: yesterday, mealCount: 0, doneCount: 0, otherCount: 0, removedCount: 0 },
        { date: today, mealCount: 0, doneCount: 0, otherCount: 0, removedCount: 0 },
      ],
    });

    const created = await createPlan(coachA, client, breakfastAndLunch);
    const [breakfast, lunch] = mealsOf(created);
    await insertLog(client, Number(created.id), breakfast, yesterday, "done");
    await insertLog(client, Number(created.id), lunch, yesterday, "other");
    await insertLog(client, Number(created.id), breakfast, today, "done");
    // The coach removes lunch: yesterday's log of it moves to removedCount.
    const withoutLunch = await putPlan(coachA, client, {
      meals: [{ id: breakfast.id, name: "Colazione", items: [] }, { name: "Cena", items: [] }],
    });
    assertStatus(withoutLunch, 200);

    const range = await getLogs(coachA, client, `from=${addDays(today, -2)}&to=${today}`);
    assertStatus(range, 200);
    const days = asList(asObject(range.body).days);
    days.forEach((day) => assertKeys(day, DAY_KEYS));
    assert.deepEqual(days, [
      { date: addDays(today, -2), mealCount: 2, doneCount: 0, otherCount: 0, removedCount: 0 },
      { date: yesterday, mealCount: 2, doneCount: 1, otherCount: 0, removedCount: 1 },
      { date: today, mealCount: 2, doneCount: 1, otherCount: 0, removedCount: 0 },
    ]);

    const thirtyOneDays = await getLogs(coachA, client, `from=${addDays(today, -30)}&to=${today}`);
    assertStatus(thirtyOneDays, 200);
    assert.equal(asList(asObject(thirtyOneDays.body).days).length, 31);

    assertError(
      await getLogs(coachA, client, `from=${addDays(today, -31)}&to=${today}`),
      400,
      "Range must be at most 31 days",
    );
    assertError(await getLogs(coachA, client, `to=${today}`), 400, "from must be YYYY-MM-DD");
    assertError(await getLogs(coachA, client, `from=${today}&to=nope`), 400, "to must be YYYY-MM-DD");
    // Right shape, impossible day: refused as a date, never sent to Postgres.
    assertError(await getLogs(coachA, client, `from=2025-02-29&to=${today}`), 400, "from must be YYYY-MM-DD");
    assertError(await getLogs(coachA, client, `from=2026-04-01&to=2026-04-31`), 400, "to must be YYYY-MM-DD");
    assertError(
      await getLogs(coachA, client, `from=${today}&to=${yesterday}`),
      400,
      "to must be on or after from",
    );
  });

  // Contract: 413 from the global JSON parser, before any route check.
  it("a plan within every cap but over 100 kB of UTF-8 is refused with 413 and nothing is stored", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("too-large", inviteCodeA);

    const ascii = planAtTheLimits("a");
    assert.ok(bodyBytes(ascii) < JSON_BODY_LIMIT_BYTES, `ASCII plan is ${bodyBytes(ascii)} bytes`);
    const asciiSaved = await putPlan(coachA, client, ascii);
    assertStatus(asciiSaved, 201);

    for (const char of ["à", "🍝"]) {
      const body = planAtTheLimits(char);
      assert.ok(validateMealPlanInput(body).ok, `the ${char} plan passes the validation`);
      assert.ok(bodyBytes(body) > JSON_BODY_LIMIT_BYTES, `the ${char} plan is ${bodyBytes(body)} bytes`);
      assertError(await putPlan(coachA, client, body), 413, "Request body too large");
    }

    const stored = asObject(asObject((await getPlan(coachA, client)).body).mealPlan);
    assert.equal(stored.notes, ascii.notes, "the refused PUTs left the saved plan as it was");
  });

  // Contract: two first PUTs at once.
  it("concurrent first PUTs create exactly one plan; the others get 409 or update it", async () => {
    const { coachA, inviteCodeA } = setup();
    const client = await newClient("race-create", inviteCodeA);

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => putPlan(coachA, client, breakfastAndLunch)),
    );

    const created = responses.filter((response) => response.status === 201);
    assert.equal(created.length, 1, responses.map(failMessage).join("; "));
    for (const response of responses.filter((entry) => entry.status !== 201)) {
      if (response.status === 409) {
        assertError(response, 409, "Meal plan already exists");
      } else {
        assertStatus(response, 200);
        assert.equal(asObject(response.body).id, asObject(created[0].body).id);
      }
    }

    assert.equal(await storedPlanCount(coachA, client), 1);
    const stored = asObject(asObject((await getPlan(coachA, client)).body).mealPlan);
    assert.equal(stored.id, asObject(created[0].body).id);
    assert.equal(mealsOf(stored).length, 2, "every winning PUT wrote the same two meals");
  });

  // Contract and H8: a save racing an unlink never leaves a plan for an ex client.
  it("a PUT racing the unlink of the client never fails with 500 and leaves no plan behind", async () => {
    const { coachA, inviteCodeA } = setup();

    for (let round = 0; round < 6; round += 1) {
      const client = await newClient(`race-unlink-${round}`, inviteCodeA);
      // Odd rounds race an update of an existing plan, even rounds a first PUT.
      const hasPlan = round % 2 === 1;

      if (hasPlan) {
        await createPlan(coachA, client, breakfastAndLunch);
      }

      const [saved, unlinked] = await Promise.all([
        putPlan(coachA, client, breakfastAndLunch),
        unlink(coachA, client),
      ]);

      assertStatus(unlinked, 200);
      const savedStatuses = hasPlan ? [200, 404] : [201, 404];
      assert.ok(savedStatuses.includes(saved.status), `round ${round}: ${failMessage(saved)}`);
      if (saved.status === 404) {
        assert.deepEqual(saved.body, { error: "Client not found" });
      }
      assert.equal(await storedPlanCount(coachA, client), 0, `round ${round}: no plan is left`);
    }
  });
});

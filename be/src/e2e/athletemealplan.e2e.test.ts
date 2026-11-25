import "dotenv/config";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { and, eq } from "drizzle-orm";
import { todayInRome } from "../services/assignmentStatus";

type JsonObject = Record<string, unknown>;
type ApiResponse = { status: number; body: unknown };
type Account = { id: number; token: string };
/** A coach's live tag ids by name, as `GET /coach/meal-tags` lists them. */
type TagIds = Record<string, number>;
type DatabaseModule = typeof import("../db");
type SchemaModule = typeof import("../db/schema");

type Fixtures = {
  database: DatabaseModule;
  schema: SchemaModule;
  coachA: Account;
  coachB: Account;
  inviteCodeA: string;
  inviteCodeB: string;
  tagsA: TagIds;
  tagsB: TagIds;
};

const PASSWORD = "smoketest-password";
// How many times each race runs: a race that loses only now and then still shows up.
const RACE_ROUNDS = 8;

/**
 * Runs two requests at once; on odd rounds the second one starts first and the first one a
 * moment later, to try both orders and not only the one the event loop favours. Which order
 * the database sees is still up to timing: the race tests guarantee "never a 500 and a
 * consistent final state" for whichever branch comes out, and cover both branches only on
 * a best-effort basis (they do not assert that both appear, which would make them flaky).
 */
const raceInBothOrders = async (
  round: number,
  first: () => Promise<ApiResponse>,
  second: () => Promise<ApiResponse>,
): Promise<[ApiResponse, ApiResponse]> => {
  if (round % 2 === 0) {
    return Promise.all([first(), second()]);
  }

  const secondResponse = second();
  await sleep(round % 4 === 1 ? 0 : 5);
  return Promise.all([first(), secondResponse]);
};

// Field lists of the contract (docs/contracts/al-piano-pasti.md): internal columns must not leak.
const NUTRITION_KEYS = ["doneToday", "mealCount", "mealPlanId", "nextMeal", "otherToday", "updatedAt"];
const NEXT_MEAL_KEYS = ["id", "name", "timeOfDay"];
const TODAY_KEYS = ["date", "mealPlan", "nextMealId"];
const MEAL_PLAN_KEYS = ["athleteId", "createdAt", "id", "isActive", "meals", "notes", "updatedAt"];
const TODAY_MEAL_KEYS = ["id", "items", "log", "name", "notes", "position", "tagId", "timeOfDay"];
const MEAL_LOG_KEYS = ["date", "mealId", "mealName", "note", "status", "updatedAt"];
const DAY_KEYS = ["date", "doneCount", "mealCount", "otherCount", "removedCount"];

// Expected dates are computed here, by hand, not with the code under test.
const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/**
 * Read inside each test, not once at import: a suite that starts before midnight in Rome and
 * runs past it would otherwise send yesterday's date as today.
 */
const romeDays = () => {
  const today = todayInRome();
  return { today, yesterday: addDays(today, -1), dayBeforeYesterday: addDays(today, -2) };
};

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

const mealsOf = (plan: unknown): JsonObject[] => asList(asObject(plan).meals);

const withoutUpdatedAt = (value: unknown): JsonObject =>
  Object.fromEntries(Object.entries(asObject(value)).filter(([key]) => key !== "updatedAt"));

const threeMeals = (tags: TagIds) => ({
  notes: "Bevi due litri d'acqua",
  meals: [
    {
      tagId: tags.Colazione,
      timeOfDay: "07:30",
      items: [
        { food: "Avena", quantity: "80 g" },
        { food: "Latte", quantity: "200 ml" },
      ],
    },
    { tagId: tags.Pranzo, timeOfDay: "13:00", notes: "Verdure a volontà", items: [{ food: "Riso" }] },
    { tagId: tags.Cena, items: [] },
  ],
});

describe("Meal plan athlete API smoke", { concurrency: false }, () => {
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
        email: `athletemeal.${label}.${uniqueSuffix()}@example.com`,
        password: PASSWORD,
        name: `Pasti atleta ${label}`,
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

  const linkTo = async (athlete: Account, inviteCode: string): Promise<void> => {
    const linked = await api("POST", "/api/athlete/coach/link", {
      token: athlete.token,
      mobile: true,
      body: { code: inviteCode },
    });
    assertStatus(linked, 201);
  };

  const newClient = async (label: string, inviteCode: string): Promise<Account> => {
    const athlete = await register(label, true);
    await linkTo(athlete, inviteCode);
    return athlete;
  };

  const tagIdsOf = async (coach: Account): Promise<TagIds> => {
    const listed = await api("GET", "/api/coach/meal-tags", { token: coach.token });
    assertStatus(listed, 200);
    const tags = asList(asObject(listed.body).mealTags);
    return Object.fromEntries(tags.map((tag) => [String(tag.name), Number(tag.id)]));
  };

  // Coach side (AL2), used to set up and to race against.
  const planPath = (athlete: Account): string => `/api/coach/clients/${athlete.id}/meal-plan`;
  const putPlan = (coach: Account, athlete: Account, body: unknown) =>
    api("PUT", planPath(athlete), { token: coach.token, body });
  const patchPlan = (coach: Account, athlete: Account, isActive: boolean) =>
    api("PATCH", planPath(athlete), { token: coach.token, body: { isActive } });

  const savePlan = async (coach: Account, athlete: Account, body: unknown): Promise<JsonObject> => {
    const saved = await putPlan(coach, athlete, body);
    assert.ok(saved.status === 200 || saved.status === 201, failMessage(saved));
    return asObject(saved.body);
  };

  // Athlete side (AL4).
  const getHome = (athlete: Account) => api("GET", "/api/athlete/home", { token: athlete.token, mobile: true });
  const getToday = (athlete: Account) =>
    api("GET", "/api/athlete/meal-plan/today", { token: athlete.token, mobile: true });
  const putLog = (athlete: Account, body: unknown) =>
    api("PUT", "/api/athlete/meal-logs", { token: athlete.token, mobile: true, body });
  const deleteLog = (athlete: Account, mealId: unknown, date: string) =>
    api("DELETE", `/api/athlete/meal-logs?mealId=${mealId}&date=${date}`, { token: athlete.token, mobile: true });
  const getLogs = (athlete: Account, query: string) =>
    api("GET", `/api/athlete/meal-logs?${query}`, { token: athlete.token, mobile: true });

  const nutritionOf = async (athlete: Account): Promise<unknown> => {
    const home = await getHome(athlete);
    assertStatus(home, 200);
    const body = asObject(home.body);
    assert.ok("nutrition" in body, "the home always has the nutrition field");
    assert.ok("coaching" in body, "nutrition does not replace coaching");
    return body.nutrition;
  };

  const todayOf = async (athlete: Account): Promise<JsonObject> => {
    const read = await getToday(athlete);
    assertStatus(read, 200);
    return asObject(read.body);
  };

  const logMeal = async (
    athlete: Account,
    mealId: unknown,
    status: "done" | "other" = "done",
    date = romeDays().today,
  ): Promise<JsonObject> => {
    const saved = await putLog(athlete, { mealId, date, status });
    assertStatus(saved, 200);
    return asObject(saved.body);
  };

  const storedLogs = async (athlete: Account) => {
    const { database, schema } = setup();
    return database.db
      .select({
        mealId: schema.mealLogs.mealId,
        mealName: schema.mealLogs.mealName,
        date: schema.mealLogs.date,
        status: schema.mealLogs.status,
      })
      .from(schema.mealLogs)
      .where(eq(schema.mealLogs.athleteId, athlete.id));
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

    fixtures = {
      database,
      schema,
      coachA,
      coachB,
      inviteCodeA: await inviteCodeOf(coachA),
      inviteCodeB: await inviteCodeOf(coachB),
      tagsA: await tagIdsOf(coachA),
      tagsB: await tagIdsOf(coachB),
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

  it("only athletes reach the routes", async () => {
    const { coachA } = setup();

    assertStatus(await api("GET", "/api/athlete/meal-plan/today"), 401);
    assertStatus(await api("GET", "/api/athlete/meal-plan/today", { token: coachA.token }), 403);
    assertStatus(await api("PUT", "/api/athlete/meal-logs", { token: coachA.token, body: {} }), 403);
  });

  it("nutrition is null without a coach, without a plan, with a plan turned off or with no meals", async () => {
    const { today } = romeDays();
    const { coachA, inviteCodeA, tagsA, database, schema } = setup();

    const loner = await register("no-coach", true);
    assert.equal(await nutritionOf(loner), null);
    assert.deepEqual(await todayOf(loner), { date: today, mealPlan: null, nextMealId: null });

    const client = await newClient("home-null", inviteCodeA);
    assert.equal(await nutritionOf(client), null);
    assert.deepEqual(await todayOf(client), { date: today, mealPlan: null, nextMealId: null });

    const plan = await savePlan(coachA, client, threeMeals(tagsA));
    assert.notEqual(await nutritionOf(client), null);

    assertStatus(await patchPlan(coachA, client, false), 200);
    assert.equal(await nutritionOf(client), null);
    assert.deepEqual(await todayOf(client), { date: today, mealPlan: null, nextMealId: null });

    assertStatus(await patchPlan(coachA, client, true), 200);
    assert.notEqual(await nutritionOf(client), null);

    // The API refuses a plan with no meals; an older plan could still have none.
    await database.db.delete(schema.mealPlanMeals).where(eq(schema.mealPlanMeals.mealPlanId, Number(plan.id)));
    assert.equal(await nutritionOf(client), null);
  });

  it("nutrition sums up today for the home and follows the logs", async () => {
    const { yesterday } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("home-summary", inviteCodeA);
    const plan = await savePlan(coachA, client, threeMeals(tagsA));
    const [breakfast, lunch, dinner] = mealsOf(plan);

    const fresh = await nutritionOf(client);
    assertKeys(fresh, NUTRITION_KEYS);
    assertKeys(asObject(fresh).nextMeal, NEXT_MEAL_KEYS);
    assert.deepEqual(fresh, {
      mealPlanId: plan.id,
      updatedAt: plan.updatedAt,
      mealCount: 3,
      doneToday: 0,
      otherToday: 0,
      nextMeal: { id: breakfast.id, name: "Colazione", timeOfDay: "07:30" },
    });

    await logMeal(client, breakfast.id, "done");
    await logMeal(client, lunch.id, "other");
    // Yesterday's log does not count today.
    await logMeal(client, dinner.id, "done", yesterday);

    const afterLogs = asObject(await nutritionOf(client));
    assert.equal(afterLogs.doneToday, 1);
    assert.equal(afterLogs.otherToday, 1);
    assert.deepEqual(afterLogs.nextMeal, { id: dinner.id, name: "Cena", timeOfDay: null });

    await logMeal(client, dinner.id, "done");
    assert.equal(asObject(await nutritionOf(client)).nextMeal, null);
  });

  it("today gives the plan in order with names, items, notes, each meal's log and the next meal", async () => {
    const { today, yesterday } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("today", inviteCodeA);
    const plan = await savePlan(coachA, client, threeMeals(tagsA));
    const [breakfast, lunch] = mealsOf(plan);

    const fresh = await todayOf(client);
    assertKeys(fresh, TODAY_KEYS);
    assert.equal(fresh.date, today);
    assert.equal(fresh.nextMealId, breakfast.id);
    assertKeys(fresh.mealPlan, MEAL_PLAN_KEYS);
    const freshPlan = asObject(fresh.mealPlan);
    assert.equal(freshPlan.notes, "Bevi due litri d'acqua");
    assert.equal(freshPlan.isActive, true);
    const freshMeals = mealsOf(freshPlan);
    freshMeals.forEach((meal) => assertKeys(meal, TODAY_MEAL_KEYS));
    assert.deepEqual(
      freshMeals.map((meal) => [meal.name, meal.timeOfDay, meal.notes, meal.position, meal.log]),
      [
        ["Colazione", "07:30", null, 0, null],
        ["Pranzo", "13:00", "Verdure a volontà", 1, null],
        ["Cena", null, null, 2, null],
      ],
    );
    assert.deepEqual(
      asList(freshMeals[0].items).map((item) => [item.food, item.quantity]),
      [
        ["Avena", "80 g"],
        ["Latte", "200 ml"],
      ],
    );

    const saved = await putLog(client, { mealId: breakfast.id, date: today, status: "other", note: " Cornetto " });
    assertStatus(saved, 200);
    assertKeys(saved.body, MEAL_LOG_KEYS);
    assert.deepEqual(withoutUpdatedAt(saved.body), {
      mealId: breakfast.id,
      mealName: "Colazione",
      date: today,
      status: "other",
      note: "Cornetto",
    });

    const afterLog = await todayOf(client);
    assert.equal(afterLog.nextMealId, lunch.id);
    assert.deepEqual(mealsOf(afterLog.mealPlan)[0].log, saved.body);

    // Yesterday's log stays out of today.
    await logMeal(client, lunch.id, "done", yesterday);
    const withYesterday = await todayOf(client);
    assert.equal(withYesterday.nextMealId, lunch.id);
    assert.equal(mealsOf(withYesterday.mealPlan)[1].log, null);
  });

  it("logs today and yesterday, never the day before yesterday or tomorrow", async () => {
    const { today, yesterday, dayBeforeYesterday } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("days", inviteCodeA);
    const [breakfast] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));

    assert.equal((await logMeal(client, breakfast.id, "done", today)).date, today);
    assert.equal((await logMeal(client, breakfast.id, "done", yesterday)).date, yesterday);
    assertError(
      await putLog(client, { mealId: breakfast.id, date: dayBeforeYesterday, status: "done" }),
      400,
      "date must be today or yesterday",
    );
    assertError(
      await putLog(client, { mealId: breakfast.id, date: addDays(today, 1), status: "done" }),
      400,
      "date must be today or yesterday",
    );
    assertError(await deleteLog(client, breakfast.id, dayBeforeYesterday), 400, "date must be today or yesterday");

    assertStatus(await deleteLog(client, breakfast.id, yesterday), 204);
    assert.deepEqual(
      (await storedLogs(client)).map((log) => log.date),
      [today],
    );
  });

  it("refuses invalid bodies and queries with the contract errors", async () => {
    const { today } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("errors", inviteCodeA);
    const [breakfast] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));
    const valid = { mealId: breakfast.id, date: today, status: "done" };

    assertError(await putLog(client, [valid]), 400, "Invalid request body");
    assertError(await putLog(client, { ...valid, mealId: undefined }), 400, "mealId is required");
    assertError(await putLog(client, { ...valid, mealId: "1" }), 400, "Invalid meal id");
    assertError(await putLog(client, { ...valid, date: "2026-02-30" }), 400, "date must be YYYY-MM-DD");
    assertError(await putLog(client, { ...valid, status: "skipped" }), 400, "status must be done or other");
    assertError(await putLog(client, { ...valid, note: "a".repeat(281) }), 400, "note must be at most 280 characters");
    assertError(await putLog(client, { ...valid, note: "a\u0000b" }), 400, "note must not contain a NUL character");
    assertStatus(await putLog(client, { ...valid, note: "a".repeat(280) }), 200);

    assertError(await api("DELETE", `/api/athlete/meal-logs?date=${today}`, { token: client.token }), 400, "mealId is required");
    assertError(await deleteLog(client, "abc", today), 400, "Invalid meal id");
    assertError(await deleteLog(client, breakfast.id, "oggi"), 400, "date must be YYYY-MM-DD");
    assert.equal((await storedLogs(client)).length, 1);
  });

  it("PUT and DELETE are idempotent: one row per meal and day", async () => {
    const { today } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("idempotent", inviteCodeA);
    const [breakfast] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));
    const body = { mealId: breakfast.id, date: today, status: "done", note: "Tutto" };

    const first = await putLog(client, body);
    const second = await putLog(client, body);
    assertStatus(first, 200);
    assertStatus(second, 200);
    assert.deepEqual(withoutUpdatedAt(second.body), withoutUpdatedAt(first.body));
    assert.equal((await storedLogs(client)).length, 1);

    const changed = await putLog(client, { ...body, status: "other", note: null });
    assertStatus(changed, 200);
    assert.equal(asObject(changed.body).status, "other");
    assert.equal(asObject(changed.body).note, null);
    assert.deepEqual(
      (await storedLogs(client)).map((log) => log.status),
      ["other"],
    );

    assertStatus(await deleteLog(client, breakfast.id, today), 204);
    assertStatus(await deleteLog(client, breakfast.id, today), 204);
    assert.equal((await storedLogs(client)).length, 0);
    assert.equal(mealsOf((await todayOf(client)).mealPlan)[0].log, null);
  });

  it("copies the tag name into the log and keeps it after a rename", async () => {
    const { coachA, inviteCodeA } = setup();
    const created = await api("POST", "/api/coach/meal-tags", {
      token: coachA.token,
      body: { name: `Brunch ${uniqueSuffix()}` },
    });
    assertStatus(created, 201);
    const tag = asObject(created.body);
    const client = await newClient("rename", inviteCodeA);
    const [brunch] = mealsOf(await savePlan(coachA, client, { meals: [{ tagId: tag.id, items: [] }] }));

    const saved = await logMeal(client, brunch.id);
    assert.equal(saved.mealName, tag.name);

    const renamed = await api("PATCH", `/api/coach/meal-tags/${tag.id}`, {
      token: coachA.token,
      body: { name: `Pranzo tardi ${uniqueSuffix()}` },
    });
    assertStatus(renamed, 200);
    const newName = asObject(renamed.body).name;

    const [meal] = mealsOf((await todayOf(client)).mealPlan);
    assert.equal(meal.name, newName);
    assert.equal(asObject(meal.log).mealName, tag.name);
    assert.deepEqual(
      (await storedLogs(client)).map((log) => log.mealName),
      [tag.name],
    );

    // Writing again copies the name the athlete sees now, on the same row.
    const rewritten = await logMeal(client, brunch.id, "other");
    assert.equal(rewritten.mealName, newName);
    assert.deepEqual(
      (await storedLogs(client)).map((log) => log.mealName),
      [newName],
    );
  });

  it("a meal of another plan, of another coach's client or missing gets the same 404", async () => {
    const { today } = romeDays();
    const { coachA, coachB, inviteCodeA, inviteCodeB, tagsA, tagsB } = setup();
    const client = await newClient("isolation", inviteCodeA);
    const sameCoachClient = await newClient("isolation-same", inviteCodeA);
    const otherCoachClient = await newClient("isolation-other", inviteCodeB);
    const ownMeals = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));
    const [foreignMeal] = mealsOf(await savePlan(coachA, sameCoachClient, threeMeals(tagsA)));
    const [otherCoachMeal] = mealsOf(await savePlan(coachB, otherCoachClient, threeMeals(tagsB)));
    await logMeal(sameCoachClient, foreignMeal.id);
    const missingMealId = 2_000_000_000;

    for (const mealId of [foreignMeal.id, otherCoachMeal.id, missingMealId]) {
      assertError(await putLog(client, { mealId, date: today, status: "done" }), 404, "Meal not found");
    }

    for (const mealId of [ownMeals[0].id, foreignMeal.id]) {
      assertError(await putLog(otherCoachClient, { mealId, date: today, status: "done" }), 404, "Meal not found");
    }

    // Undoing another athlete's meal touches nothing of theirs.
    assertStatus(await deleteLog(client, foreignMeal.id, today), 204);
    assert.equal((await storedLogs(sameCoachClient)).length, 1);
    assert.equal((await storedLogs(client)).length, 0);

    // Each athlete reads only the plan of their own coach.
    const otherToday = await todayOf(otherCoachClient);
    assert.equal(asObject(otherToday.mealPlan).athleteId, otherCoachClient.id);
    const otherMealIds = mealsOf(otherToday.mealPlan).map((meal) => meal.id);
    assert.ok(otherMealIds.includes(otherCoachMeal.id));
    assert.ok(!otherMealIds.includes(foreignMeal.id));
  });

  it("a plan turned off cannot be logged or undone until it is turned back on", async () => {
    const { today } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("inactive", inviteCodeA);
    const [breakfast, lunch] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));
    await logMeal(client, breakfast.id);

    assertStatus(await patchPlan(coachA, client, false), 200);
    assertError(await putLog(client, { mealId: lunch.id, date: today, status: "done" }), 404, "Meal plan not found");
    assertError(await deleteLog(client, breakfast.id, today), 404, "Meal plan not found");
    assert.equal((await storedLogs(client)).length, 1);

    assertStatus(await patchPlan(coachA, client, true), 200);
    await logMeal(client, lunch.id);
    assert.equal((await storedLogs(client)).length, 2);
  });

  it("after unlinking nothing is left to log; a new coach shows only their plan", async () => {
    const { today } = romeDays();
    const { coachA, coachB, inviteCodeA, inviteCodeB, tagsA, tagsB } = setup();
    const client = await newClient("unlink", inviteCodeA);
    const [oldBreakfast] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));
    await logMeal(client, oldBreakfast.id);

    const unlinked = await api("DELETE", "/api/athlete/coach", { token: client.token, mobile: true });
    assertStatus(unlinked, 200);
    assert.equal(await nutritionOf(client), null);
    assert.deepEqual(await todayOf(client), { date: today, mealPlan: null, nextMealId: null });
    assertError(await putLog(client, { mealId: oldBreakfast.id, date: today, status: "done" }), 404, "Meal plan not found");
    assertError(await deleteLog(client, oldBreakfast.id, today), 404, "Meal plan not found");
    assert.equal((await storedLogs(client)).length, 0, "the cascade cleared the old logs (H8)");

    await linkTo(client, inviteCodeB);
    assert.equal(await nutritionOf(client), null, "the new coach has no plan yet");

    const newPlan = await savePlan(coachB, client, { meals: [{ tagId: tagsB.Cena, items: [] }] });
    const nutrition = asObject(await nutritionOf(client));
    assert.equal(nutrition.mealPlanId, newPlan.id);
    assert.equal(nutrition.mealCount, 1);
    assert.deepEqual(
      mealsOf((await todayOf(client)).mealPlan).map((meal) => meal.id),
      mealsOf(newPlan).map((meal) => meal.id),
    );
    assertError(await putLog(client, { mealId: oldBreakfast.id, date: today, status: "done" }), 404, "Meal not found");

    // Coach A can no longer see this athlete's plan.
    assertError(await api("GET", planPath(client), { token: coachA.token }), 404, "Client not found");
  });

  it("two identical PUTs at once leave one row, never a 500", async () => {
    const { today, yesterday } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("race-put", inviteCodeA);
    const meals = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));

    for (const round of Array.from({ length: RACE_ROUNDS }, (_, index) => index)) {
      const meal = meals[round % meals.length];
      const date = round % 2 === 0 ? today : yesterday;
      const status = round % 3 === 0 ? "other" : "done";
      const body = { mealId: meal.id, date, status };
      const responses = await Promise.all([putLog(client, body), putLog(client, body), putLog(client, body)]);
      responses.forEach((response) => assertStatus(response, 200));

      const rows = (await storedLogs(client)).filter((log) => log.mealId === meal.id && log.date === date);
      assert.equal(rows.length, 1, `round ${round}`);
      assert.equal(rows[0].status, status);

      assertStatus(await deleteLog(client, meal.id, date), 204);
    }
  });

  it("a PUT racing the coach's save that removes the meal: 200 then an orphan log, or 404; never a 500", async () => {
    const { today } = romeDays();
    const { coachA, inviteCodeA, tagsA, database, schema } = setup();
    const client = await newClient("race-save", inviteCodeA);

    for (const round of Array.from({ length: RACE_ROUNDS }, (_, index) => index)) {
      // Each round starts with a fresh breakfast and a lunch that stays.
      const plan = await savePlan(coachA, client, {
        meals: [
          { tagId: tagsA.Colazione, items: [] },
          { tagId: tagsA.Pranzo, items: [] },
        ],
      });
      const [breakfast, lunch] = mealsOf(plan);
      await database.db.delete(schema.mealLogs).where(eq(schema.mealLogs.athleteId, client.id));

      const [logged, saved] = await raceInBothOrders(
        round,
        () => putLog(client, { mealId: breakfast.id, date: today, status: "done" }),
        () => putPlan(coachA, client, { meals: [{ id: lunch.id, tagId: tagsA.Pranzo, items: [] }] }),
      );
      assertStatus(saved, 200);
      assert.ok(logged.status === 200 || logged.status === 404, `round ${round}: ${failMessage(logged)}`);

      const rows = await storedLogs(client);

      if (logged.status === 200) {
        // The log came first; the save then removed its meal: the contract's orphan log.
        assert.deepEqual(rows, [{ mealId: null, mealName: "Colazione", date: today, status: "done" }], `round ${round}`);
      } else {
        assert.deepEqual(logged.body, { error: "Meal not found" });
        assert.deepEqual(rows, [], `round ${round}`);
      }
    }
  });

  it("a PUT racing an unlink: 200 then the cascade, or 404; never a log left for an ex coach", async () => {
    const { today } = romeDays();
    const { coachA, inviteCodeA, tagsA, database, schema } = setup();
    const client = await newClient("race-unlink", inviteCodeA);

    for (const round of Array.from({ length: RACE_ROUNDS }, (_, index) => index)) {
      const [breakfast] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));

      const [logged, unlinked] = await raceInBothOrders(
        round,
        () => putLog(client, { mealId: breakfast.id, date: today, status: "done" }),
        () => api("DELETE", `/api/coach/clients/${client.id}`, { token: coachA.token }),
      );
      assertStatus(unlinked, 200);
      assert.ok(logged.status === 200 || logged.status === 404, `round ${round}: ${failMessage(logged)}`);
      assert.equal((await storedLogs(client)).length, 0, `round ${round}`);

      const plans = await database.db
        .select({ id: schema.mealPlans.id })
        .from(schema.mealPlans)
        .where(and(eq(schema.mealPlans.coachId, coachA.id), eq(schema.mealPlans.athleteId, client.id)));
      assert.equal(plans.length, 0, `round ${round}`);

      await linkTo(client, inviteCodeA);
    }
  });

  it("meal-logs gives the athlete's days like the coach's view, up to 31 days", async () => {
    const { today, yesterday } = romeDays();
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("range", inviteCodeA);
    const [breakfast, lunch] = mealsOf(await savePlan(coachA, client, threeMeals(tagsA)));
    await logMeal(client, breakfast.id, "done");
    await logMeal(client, lunch.id, "other");
    await logMeal(client, breakfast.id, "other", yesterday);

    const query = `from=${addDays(today, -6)}&to=${today}`;
    const read = await getLogs(client, query);
    assertStatus(read, 200);
    assertKeys(read.body, ["days"]);
    const days = asList(asObject(read.body).days);
    assert.equal(days.length, 7);
    days.forEach((day) => assertKeys(day, DAY_KEYS));
    assert.deepEqual(days[6], { date: today, mealCount: 3, doneCount: 1, otherCount: 1, removedCount: 0 });
    assert.deepEqual(days[5], { date: yesterday, mealCount: 3, doneCount: 0, otherCount: 1, removedCount: 0 });

    const coachView = await api("GET", `/api/coach/clients/${client.id}/meal-logs?${query}`, { token: coachA.token });
    assert.deepEqual(read.body, coachView.body);

    assertStatus(await getLogs(client, `from=${addDays(today, -30)}&to=${today}`), 200);
    assertError(await getLogs(client, `from=${addDays(today, -31)}&to=${today}`), 400, "Range must be at most 31 days");
    assertError(await getLogs(client, `from=oggi&to=${today}`), 400, "from must be YYYY-MM-DD");
    assertError(await getLogs(client, `from=${today}&to=${yesterday}`), 400, "to must be on or after from");

    const loner = await register("range-no-coach", true);
    const lonerRead = await getLogs(loner, `from=${yesterday}&to=${today}`);
    assertStatus(lonerRead, 200);
    assert.deepEqual(lonerRead.body, {
      days: [yesterday, today].map((date) => ({ date, mealCount: 0, doneCount: 0, otherCount: 0, removedCount: 0 })),
    });
  });
});

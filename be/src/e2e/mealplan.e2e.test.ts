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

// express.json() default limit ("100kb" in the bytes package): 102400 bytes of raw body.
const JSON_BODY_LIMIT_BYTES = 100 * 1024;

// Field lists of the contract (docs/contracts/al-piano-pasti.md): internal columns must not leak.
const MEAL_PLAN_KEYS = ["athleteId", "createdAt", "id", "isActive", "meals", "notes", "updatedAt"];
const MEAL_KEYS = ["id", "items", "name", "notes", "position", "tagId", "timeOfDay"];
const TAG_KEYS = ["archivedAt", "id", "name", "position"];
const TEMPLATE_KEYS = ["createdAt", "id", "meals", "name", "updatedAt"];
const TEMPLATE_MEAL_KEYS = ["name", "tagId", "timeOfDay"];
const STARTER_TAG_NAMES = ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"];
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
const planAtTheLimits = (char: string, tagId: number) => {
  // Lengths are UTF-16 units: an emoji counts 2, so it is repeated half as many times.
  const text = (units: number) => char.repeat(units / char.length);
  return {
    notes: text(1000),
    meals: Array.from({ length: 12 }, () => ({
      tagId,
      timeOfDay: "12:00",
      notes: text(500),
      items: Array.from({ length: 30 }, () => ({ food: text(120), quantity: text(60) })),
    })),
  };
};

const bodyBytes = (body: unknown): number => Buffer.byteLength(JSON.stringify(body), "utf8");

const shuffled = <T>(values: T[]): T[] => {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }

  return copy;
};

const mealsOf = (plan: unknown): JsonObject[] => asList(asObject(plan).meals);
const itemsOf = (meal: JsonObject): JsonObject[] => asList(meal.items);

const breakfastAndLunch = (tags: TagIds) => ({
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
  ],
});

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

  const getTags = (coach: Account) => api("GET", "/api/coach/meal-tags", { token: coach.token });
  const postTag = (coach: Account, body: unknown) => api("POST", "/api/coach/meal-tags", { token: coach.token, body });
  const patchTag = (coach: Account, tagId: number | string, body: unknown) =>
    api("PATCH", `/api/coach/meal-tags/${tagId}`, { token: coach.token, body });

  const tagsOf = async (coach: Account): Promise<JsonObject[]> => {
    const listed = await getTags(coach);
    assertStatus(listed, 200);
    return asList(asObject(listed.body).mealTags);
  };

  const tagIdsOf = async (coach: Account): Promise<TagIds> => {
    const tags = await tagsOf(coach);
    return Object.fromEntries(tags.map((tag) => [String(tag.name), Number(tag.id)]));
  };

  const templatesPath = "/api/coach/meal-plan-templates";
  const getTemplates = (coach: Account) => api("GET", templatesPath, { token: coach.token });
  const postTemplate = (coach: Account, body: unknown) => api("POST", templatesPath, { token: coach.token, body });
  const putTemplate = (coach: Account, templateId: unknown, body: unknown) =>
    api("PUT", `${templatesPath}/${templateId}`, { token: coach.token, body });
  const deleteTemplate = (coach: Account, templateId: unknown) =>
    api("DELETE", `${templatesPath}/${templateId}`, { token: coach.token });

  const storedTagCount = async (coach: Account): Promise<number> => {
    const { database, schema } = setup();
    const rows = await database.db
      .select({ id: schema.mealTags.id })
      .from(schema.mealTags)
      .where(eq(schema.mealTags.coachId, coach.id));
    return rows.length;
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

    // Fixtures is set before the tags are read: tagIdsOf goes through setup().
    fixtures = {
      database,
      schema,
      coachA,
      coachB,
      inviteCodeA: await inviteCodeOf(coachA),
      inviteCodeB: await inviteCodeOf(coachB),
      tagsA: {},
      tagsB: {},
    };
    fixtures.tagsA = await tagIdsOf(coachA);
    fixtures.tagsB = await tagIdsOf(coachB);
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
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("create", inviteCodeA);

    const empty = await getPlan(coachA, client);
    assertStatus(empty, 200);
    assert.deepEqual(empty.body, { mealPlan: null });

    const created = await createPlan(coachA, client, breakfastAndLunch(tagsA));
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
    const updated = await putPlan(coachA, client, { ...breakfastAndLunch(tagsA), notes: null });
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
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("ids", inviteCodeA);
    const created = await createPlan(coachA, client, breakfastAndLunch(tagsA));
    const planId = Number(created.id);
    const [breakfast, lunch] = mealsOf(created);
    const [oats, milk] = itemsOf(breakfast);
    await insertLog(client, planId, lunch, today, "done");
    await insertLog(client, planId, breakfast, today, "other");

    const saved = await putPlan(coachA, client, {
      meals: [
        { tagId: tagsA.Cena, items: [{ food: "Pesce", quantity: "150 g" }] },
        {
          id: breakfast.id,
          tagId: tagsA.Merenda,
          timeOfDay: null,
          items: [{ id: milk.id, food: "Latte di avena", quantity: "250 ml" }, { food: "Banana" }],
        },
      ],
    });

    assertStatus(saved, 200);
    const [dinner, breakfastAfter] = mealsOf(saved.body);
    assert.equal(dinner.name, "Cena");
    assert.equal(dinner.tagId, tagsA.Cena);
    assert.equal(dinner.position, 0);
    assert.equal(breakfastAfter.id, breakfast.id);
    assert.equal(breakfastAfter.name, "Merenda", "a kept meal can change tag");
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

    // A plan keeps at least one meal (decision of 2026-11-22).
    assertError(await putPlan(coachA, client, { meals: [] }), 400, "meals must have at least 1 entry");
    assert.deepEqual(asObject((await getPlan(coachA, client)).body).mealPlan, saved.body, "the refused PUT changed nothing");
  });

  // AC4, AC9
  it("refuses ids of another plan with 404 and never touches the other plan", async () => {
    const { coachA, coachB, inviteCodeA, inviteCodeB, tagsA, tagsB } = setup();
    const clientOfA = await newClient("own-a", inviteCodeA);
    const otherClientOfA = await newClient("other-a", inviteCodeA);
    const clientOfB = await newClient("own-b", inviteCodeB);
    const planOfA = await createPlan(coachA, clientOfA, breakfastAndLunch(tagsA));
    const planOfB = await createPlan(coachB, clientOfB, breakfastAndLunch(tagsB));
    const [mealOfB] = mealsOf(planOfB);
    const [itemOfB] = itemsOf(mealOfB);
    const [mealOfA, secondMealOfA] = mealsOf(planOfA);

    const otherCoachMeal = await putPlan(coachA, clientOfA, {
      meals: [{ id: mealOfB.id, tagId: tagsA.Pranzo, items: [] }],
    });
    assertError(otherCoachMeal, 404, "Meal not found");

    const otherCoachItem = await putPlan(coachA, clientOfA, {
      meals: [{ id: mealOfA.id, tagId: tagsA.Colazione, items: [{ id: itemOfB.id, food: "Rubato" }] }],
    });
    assertError(otherCoachItem, 404, "Meal item not found");

    const itemOfOtherMeal = await putPlan(coachA, clientOfA, {
      meals: [{ id: secondMealOfA.id, tagId: tagsA.Pranzo, items: [{ id: itemsOf(mealOfA)[0].id, food: "Avena" }] }],
    });
    assertError(itemOfOtherMeal, 404, "Meal item not found");

    // Same coach, another client's plan: still a foreign id. The first PUT has no ids to update.
    const firstPutWithIds = await putPlan(coachA, otherClientOfA, {
      meals: [{ id: mealOfA.id, tagId: tagsA.Colazione, items: [] }],
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
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("patch", inviteCodeA);

    assertError(await patchPlan(coachA, client, { isActive: false }), 404, "Meal plan not found");

    const created = await createPlan(coachA, client, breakfastAndLunch(tagsA));

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

    const updatedWhileOff = await putPlan(coachA, client, breakfastAndLunch(tagsA));
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
    const { coachA, inviteCodeA, tagsA } = setup();
    const stranger = await register("stranger", true);

    assertError(await getPlan(coachA, stranger), 404, "Client not found");
    assertError(await putPlan(coachA, stranger, breakfastAndLunch(tagsA)), 404, "Client not found");
    assertError(await patchPlan(coachA, stranger, { isActive: true }), 404, "Client not found");
    assertError(await getLogs(coachA, stranger, `from=${today}&to=${today}`), 404, "Client not found");
    assertError(await api("GET", planPath("abc"), { token: coachA.token }), 400, "Invalid athlete id");
    assertError(await api("GET", planPath(0), { token: coachA.token }), 400, "Invalid athlete id");

    // Only coaches: the athlete's own token is refused by the role check.
    const athleteCall = await api("GET", planPath(stranger.id), { token: stranger.token, mobile: true });
    assertStatus(athleteCall, 403);

    // Unlinking deletes the plan and its logs (H8).
    const leaving = await newClient("leaving", inviteCodeA);
    const created = await createPlan(coachA, leaving, breakfastAndLunch(tagsA));
    await insertLog(leaving, Number(created.id), mealsOf(created)[0], today, "done");
    const unlinked = await api("DELETE", `/api/coach/clients/${leaving.id}`, { token: coachA.token });
    assertStatus(unlinked, 200);
    assertError(await getPlan(coachA, leaving), 404, "Client not found");
    assert.equal((await storedLogs(Number(created.id))).length, 0);
  });

  // AC7
  it("refuses bodies past the limits with 400", async () => {
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("limits", inviteCodeA);
    const meal = { tagId: tagsA.Pranzo, items: [{ food: "Cibo" }] };
    const thirteenMeals = Array.from({ length: 13 }, () => meal);
    const thirtyOneItems = Array.from({ length: 31 }, () => ({ food: "Cibo" }));

    const cases: [unknown, string][] = [
      [{ meals: thirteenMeals }, "meals must have at most 12 entries"],
      [{ meals: [] }, "meals must have at least 1 entry"],
      [{ meals: [{ items: [] }] }, "meals.tagId is required"],
      [{ meals: [{ ...meal, tagId: "Pranzo" }] }, "Invalid meal tag id"],
      [{ meals: [{ ...meal, items: thirtyOneItems }] }, "meals.items must have at most 30 entries"],
      [{ meals: [{ ...meal, items: [{ food: "a".repeat(121) }] }] }, "meals.items.food must be at most 120 characters"],
      [
        { meals: [{ ...meal, items: [{ food: "Cibo", quantity: "a".repeat(61) }] }] },
        "meals.items.quantity must be at most 60 characters",
      ],
      [{ notes: "a".repeat(1001), meals: [] }, "notes must be at most 1000 characters"],
      [{ meals: [{ ...meal, notes: "a".repeat(501) }] }, "meals.notes must be at most 500 characters"],
      [{ meals: [{ ...meal, timeOfDay: "25:00" }] }, "meals.timeOfDay must be HH:MM or null"],
      [{ meals: [{ ...meal, notes: "a\u0000b" }] }, "meals.notes must not contain a NUL character"],
      [{ meals: [meal, { ...meal }].map((entry) => ({ ...entry, id: 5 })) }, "Duplicate meal id"],
      [
        { meals: [{ ...meal, items: [{ id: 7, food: "Cibo" }, { id: 7, food: "Altro" }] }] },
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
    const { coachA, inviteCodeA, tagsA } = setup();
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

    const created = await createPlan(coachA, client, breakfastAndLunch(tagsA));
    const [breakfast, lunch] = mealsOf(created);
    await insertLog(client, Number(created.id), breakfast, yesterday, "done");
    await insertLog(client, Number(created.id), lunch, yesterday, "other");
    await insertLog(client, Number(created.id), breakfast, today, "done");
    // The coach removes lunch: yesterday's log of it moves to removedCount.
    const withoutLunch = await putPlan(coachA, client, {
      meals: [{ id: breakfast.id, tagId: tagsA.Colazione, items: [] }, { tagId: tagsA.Cena, items: [] }],
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
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("too-large", inviteCodeA);

    const ascii = planAtTheLimits("a", tagsA.Pranzo);
    assert.ok(bodyBytes(ascii) < JSON_BODY_LIMIT_BYTES, `ASCII plan is ${bodyBytes(ascii)} bytes`);
    const asciiSaved = await putPlan(coachA, client, ascii);
    assertStatus(asciiSaved, 201);

    for (const char of ["à", "🍝"]) {
      const body = planAtTheLimits(char, tagsA.Pranzo);
      assert.ok(validateMealPlanInput(body).ok, `the ${char} plan passes the validation`);
      assert.ok(bodyBytes(body) > JSON_BODY_LIMIT_BYTES, `the ${char} plan is ${bodyBytes(body)} bytes`);
      assertError(await putPlan(coachA, client, body), 413, "Request body too large");
    }

    const stored = asObject(asObject((await getPlan(coachA, client)).body).mealPlan);
    assert.equal(stored.notes, ascii.notes, "the refused PUTs left the saved plan as it was");
  });

  // Contract: two first PUTs at once.
  it("concurrent first PUTs create exactly one plan; the others get 409 or update it", async () => {
    const { coachA, inviteCodeA, tagsA } = setup();
    const client = await newClient("race-create", inviteCodeA);

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => putPlan(coachA, client, breakfastAndLunch(tagsA))),
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
    const { coachA, inviteCodeA, tagsA } = setup();

    for (let round = 0; round < 6; round += 1) {
      const client = await newClient(`race-unlink-${round}`, inviteCodeA);
      // Odd rounds race an update of an existing plan, even rounds a first PUT.
      const hasPlan = round % 2 === 1;

      if (hasPlan) {
        await createPlan(coachA, client, breakfastAndLunch(tagsA));
      }

      const [saved, unlinked] = await Promise.all([
        putPlan(coachA, client, breakfastAndLunch(tagsA)),
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

  /** A coach of its own, for tests that rename, move or archive tags. */
  const newCoach = async (label: string) => {
    const coach = await register(label, false);
    const inviteCode = await inviteCodeOf(coach);
    return { coach, inviteCode };
  };

  // Decision 2: starter tags, created lazily and once.
  it("creates the starter tags once on the first read, also with reads at the same time", async () => {
    for (let round = 0; round < 3; round += 1) {
      const { coach } = await newCoach(`starter-${round}`);
      assert.equal(await storedTagCount(coach), 0, "registering creates no tags");

      const reads = await Promise.all(Array.from({ length: 3 }, () => getTags(coach)));

      for (const read of reads) {
        assertStatus(read, 200);
        const tags = asList(asObject(read.body).mealTags);
        tags.forEach((tag) => assertKeys(tag, TAG_KEYS));
        assert.deepEqual(tags.map((tag) => tag.name), STARTER_TAG_NAMES, `round ${round}`);
        assert.deepEqual(tags.map((tag) => tag.archivedAt), [null, null, null, null, null]);
      }
      assert.equal(await storedTagCount(coach), 5, `round ${round}: five rows, not ten or fifteen`);
    }

    const { coach } = await newCoach("starter-archived");
    const [breakfast] = await tagsOf(coach);
    assertStatus(await patchTag(coach, Number(breakfast.id), { archived: true }), 200);
    assert.deepEqual((await tagsOf(coach)).map((tag) => tag.name), STARTER_TAG_NAMES.slice(1), "archived starters stay away");
  });

  it("adds, renames and moves tags; names are unique per coach ignoring case", async () => {
    const { coach } = await newCoach("tags");
    const other = await newCoach("tags-other");
    const tags = await tagIdsOf(coach);

    const added = await postTag(coach, { name: "  Pre-nanna " });
    assertStatus(added, 201);
    assertKeys(added.body, TAG_KEYS);
    assert.equal(asObject(added.body).name, "Pre-nanna");
    assert.deepEqual((await tagsOf(coach)).map((tag) => tag.name), [...STARTER_TAG_NAMES, "Pre-nanna"]);

    assertError(await postTag(coach, { name: "PRANZO" }), 409, "Meal tag already exists");
    assertError(await patchTag(coach, tags.Cena, { name: "colazione" }), 409, "Meal tag already exists");
    assertStatus(await postTag(other.coach, { name: "Pre-nanna" }), 201);

    const renamed = await patchTag(coach, tags.Spuntino, { name: "Spuntino di metà mattina" });
    assertStatus(renamed, 200);
    assert.equal(asObject(renamed.body).name, "Spuntino di metà mattina");
    assertStatus(await patchTag(coach, tags.Cena, { name: "cena" }), 200);

    assertStatus(await patchTag(coach, Number(asObject(added.body).id), { position: 0 }), 200);
    assertStatus(await patchTag(coach, tags.Colazione, { position: 29 }), 200);
    const reordered = await tagsOf(coach);
    assert.deepEqual(
      reordered.map((tag) => tag.name),
      ["Pre-nanna", "Spuntino di metà mattina", "Pranzo", "Merenda", "cena", "Colazione"],
    );
    assert.deepEqual(reordered.map((tag) => tag.position), [0, 1, 2, 3, 4, 5]);

    assertError(await patchTag(other.coach, tags.Pranzo, { name: "Mio" }), 404, "Meal tag not found");
    assertError(await patchTag(coach, 2_147_483_647, { name: "Nessuno" }), 404, "Meal tag not found");
    assertError(await patchTag(coach, "abc", { name: "X" }), 400, "Invalid meal tag id");
    assertError(await patchTag(coach, tags.Pranzo, {}), 400, "At least one field is required");
    assertError(await patchTag(coach, tags.Pranzo, { archived: false }), 400, "archived must be true");
    assertError(await patchTag(coach, tags.Pranzo, { position: 30 }), 400, "position must be an integer from 0 to 29");
    assertError(await postTag(coach, { name: "a".repeat(61) }), 400, "name must be at most 60 characters");
    assertError(await postTag(coach, { name: " " }), 400, "name is required");

    const liveCount = (await tagsOf(coach)).length;
    for (let index = liveCount; index < 30; index += 1) {
      assertStatus(await postTag(coach, { name: `Tag ${index}` }), 201);
    }
    assertError(await postTag(coach, { name: "Uno di troppo" }), 409, "Too many meal tags");
  });

  // Two writers locking the same tag rows in different orders deadlock: Postgres kills one with a 500.
  it("saving plans and templates while the tags are moved never fails with 500 and keeps positions contiguous", async () => {
    const { coach, inviteCode } = await newCoach("tag-race");

    for (const name of ["Pre-allenamento", "Post-allenamento", "Pre-nanna"]) {
      assertStatus(await postTag(coach, { name }), 201);
    }
    const tags = await tagsOf(coach);
    const tagIds = tags.map((tag) => Number(tag.id));
    const clients = await Promise.all(["a", "b", "c", "d"].map((label) => newClient(`tag-race-${label}`, inviteCode)));
    // Every body uses every tag, in a new order each time: the plan and template lock all of them.
    const planBody = () => ({ meals: shuffled(tagIds).map((tagId) => ({ tagId, items: [] })) });
    const templateBody = (name: string) => ({
      name,
      meals: shuffled(tagIds).map((tagId) => ({ tagId })),
    });

    for (const client of clients) {
      await createPlan(coach, client, planBody());
    }
    const templateIds: number[] = [];
    for (const label of ["uno", "due"]) {
      const created = await postTemplate(coach, templateBody(`Base ${label}`));
      assertStatus(created, 201);
      templateIds.push(Number(asObject(created.body).id));
    }

    for (let round = 0; round < 20; round += 1) {
      const [planSaves, templateCreates, templateReplaces, moves] = await Promise.all([
        Promise.all(clients.map((client) => putPlan(coach, client, planBody()))),
        Promise.all([0, 1].map((index) => postTemplate(coach, templateBody(`Giro ${round}-${index}`)))),
        Promise.all(templateIds.map((id) => putTemplate(coach, id, templateBody(`Base ${round}`)))),
        Promise.all(
          shuffled(tagIds)
            .slice(0, 4)
            .map((tagId) => patchTag(coach, tagId, { position: Math.floor(Math.random() * tagIds.length) })),
        ),
      ]);

      const requests: [string, ApiResponse[], number][] = [
        ["PUT plan", planSaves, 200],
        ["POST template", templateCreates, 201],
        ["PUT template", templateReplaces, 200],
        ["PATCH tag", moves, 200],
      ];
      for (const [label, responses, status] of requests) {
        for (const response of responses) {
          assert.equal(response.status, status, `round ${round}, ${label}: ${failMessage(response)}`);
        }
      }

      const positions = (await tagsOf(coach)).map((tag) => tag.position);
      assert.deepEqual(
        positions,
        tagIds.map((_, position) => position),
        `round ${round}: positions are 0..n-1`,
      );

      // Keeps the coach under the cap of 20 templates.
      for (const created of templateCreates) {
        assertStatus(await deleteTemplate(coach, asObject(created.body).id), 204);
      }
    }
  });

  // Decision 3: a rename shows in the plan, not in the athlete's log.
  it("renaming a tag renames the meal in the plan but not the meal name of a written log", async () => {
    const { coach, inviteCode } = await newCoach("rename");
    const tags = await tagIdsOf(coach);
    const client = await newClient("rename-client", inviteCode);
    const created = await createPlan(coach, client, breakfastAndLunch(tags));
    const [breakfast] = mealsOf(created);
    await insertLog(client, Number(created.id), breakfast, today, "done");

    assertStatus(await patchTag(coach, tags.Colazione, { name: "Prima colazione" }), 200);

    const read = asObject(asObject((await getPlan(coach, client)).body).mealPlan);
    assert.deepEqual(mealsOf(read).map((meal) => [meal.id, meal.tagId, meal.name]), [
      [breakfast.id, tags.Colazione, "Prima colazione"],
      [mealsOf(created)[1].id, tags.Pranzo, "Pranzo"],
    ]);
    assert.deepEqual(await storedLogs(Number(created.id)), [{ mealId: Number(breakfast.id), mealName: "Colazione" }]);
  });

  // Decision 4: an archived tag stays where it is used, but is no longer offered.
  it("archiving a used tag hides it from the list, keeps it in the plan and refuses it for a new meal", async () => {
    const { coach, inviteCode } = await newCoach("archive");
    const tags = await tagIdsOf(coach);
    const client = await newClient("archive-client", inviteCode);
    const otherClient = await newClient("archive-other", inviteCode);
    const created = await createPlan(coach, client, breakfastAndLunch(tags));
    const [breakfast, lunch] = mealsOf(created);

    const archived = await patchTag(coach, tags.Pranzo, { archived: true });
    assertStatus(archived, 200);
    assert.ok(asObject(archived.body).archivedAt !== null);
    assert.ok(!(await tagsOf(coach)).some((tag) => tag.id === tags.Pranzo), "gone from the list");
    assertError(await patchTag(coach, tags.Pranzo, { name: "Pranzo leggero" }), 404, "Meal tag not found");

    const read = asObject(asObject((await getPlan(coach, client)).body).mealPlan);
    assert.deepEqual(mealsOf(read).map((meal) => meal.name), ["Colazione", "Pranzo"], "the plan still shows it");

    const keepMeals = (plan: JsonObject) =>
      mealsOf(plan).map((meal) => ({ id: meal.id, tagId: meal.tagId, items: [] }));
    const kept = await putPlan(coach, client, { meals: keepMeals(read) });
    assertStatus(kept, 200);
    assert.deepEqual(mealsOf(kept.body).map((meal) => meal.name), ["Colazione", "Pranzo"]);

    const addedAgain = await putPlan(coach, client, {
      meals: [...keepMeals(read), { tagId: tags.Pranzo, items: [] }],
    });
    assertError(addedAgain, 404, "Meal tag not found");
    const movedToBreakfast = await putPlan(coach, client, {
      meals: [{ id: breakfast.id, tagId: tags.Pranzo, items: [] }, { id: lunch.id, tagId: tags.Cena, items: [] }],
    });
    assertStatus(movedToBreakfast, 200);
    assertError(
      await putPlan(coach, otherClient, { meals: [{ tagId: tags.Pranzo, items: [] }] }),
      404,
      "Meal tag not found",
    );

    // The name is free again for a new live tag.
    assertStatus(await postTag(coach, { name: "Pranzo" }), 201);
  });

  // Contract, Archiviazione: the archived tag may appear as often as in the saved version, no more.
  it("an archived tag appears at most as often as in the saved plan or template: a new meal takes it only where an existing one lets it go", async () => {
    const { coach, inviteCode } = await newCoach("archive-count");
    const tags = await tagIdsOf(coach);
    const client = await newClient("archive-count-client", inviteCode);
    const lunch = (id?: number) => ({ id, tagId: tags.Pranzo, items: [] });
    const created = await createPlan(coach, client, {
      meals: [lunch(), lunch(), { tagId: tags.Colazione, items: [] }],
    });
    const [first, second] = mealsOf(created);
    assertStatus(await patchTag(coach, tags.Pranzo, { archived: true }), 200);
    const lunchCount = async (): Promise<number> =>
      mealsOf(asObject((await getPlan(coach, client)).body).mealPlan).filter((meal) => meal.tagId === tags.Pranzo).length;

    assertError(
      await putPlan(coach, client, { meals: [lunch(Number(first.id)), lunch(Number(second.id)), lunch()] }),
      404,
      "Meal tag not found",
    );
    assert.equal(await lunchCount(), 2, "the refused save changed nothing");

    // The second meal lets the tag go, a new meal takes it: still two.
    const swapped = await putPlan(coach, client, {
      meals: [lunch(Number(first.id)), { id: second.id, tagId: tags.Colazione, items: [] }, lunch()],
    });
    assertStatus(swapped, 200);
    assert.equal(await lunchCount(), 2);

    assertError(await putPlan(coach, client, { meals: [lunch(), lunch(), lunch()] }), 404, "Meal tag not found");

    // Down to one meal: a second one with the tag is now more than the saved version has.
    assertStatus(await putPlan(coach, client, { meals: [lunch(Number(mealsOf(swapped.body)[0].id))] }), 200);
    assertError(await putPlan(coach, client, { meals: [lunch(), lunch()] }), 404, "Meal tag not found");

    // Templates have no meal ids: the same count rule.
    const other = await newCoach("archive-count-template");
    const otherTags = await tagIdsOf(other.coach);
    const template = await postTemplate(other.coach, {
      name: "Con pranzo",
      meals: [{ tagId: otherTags.Pranzo }, { tagId: otherTags.Cena }],
    });
    assertStatus(template, 201);
    const templateId = asObject(template.body).id;
    assertStatus(await patchTag(other.coach, otherTags.Pranzo, { archived: true }), 200);
    const withLunches = (count: number) => ({
      name: "Con pranzo",
      meals: Array.from({ length: count }, () => ({ tagId: otherTags.Pranzo })),
    });
    assertError(await putTemplate(other.coach, templateId, withLunches(2)), 404, "Meal tag not found");
    assertStatus(await putTemplate(other.coach, templateId, withLunches(1)), 200);
    assertError(await postTemplate(other.coach, withLunches(1)), 404, "Meal tag not found");
  });

  it("archiving together with a rename or a position: the rename applies, the position does not", async () => {
    const { coach, inviteCode } = await newCoach("archive-combined");
    const tags = await tagIdsOf(coach);
    const client = await newClient("archive-combined-client", inviteCode);
    await createPlan(coach, client, breakfastAndLunch(tags));

    // Another live tag has this name: the archived tag leaves the unique index, so no 409.
    const renamed = await patchTag(coach, tags.Pranzo, { name: "Cena", archived: true });
    assertStatus(renamed, 200);
    assert.equal(asObject(renamed.body).name, "Cena");
    assert.ok(asObject(renamed.body).archivedAt !== null);
    const plan = asObject(asObject((await getPlan(coach, client)).body).mealPlan);
    assert.deepEqual(mealsOf(plan).map((meal) => meal.name), ["Colazione", "Cena"], "the plan shows the new name");

    const before = await tagsOf(coach);
    const moved = await patchTag(coach, tags.Merenda, { position: 0, archived: true });
    assertStatus(moved, 200);
    assert.ok(asObject(moved.body).archivedAt !== null);
    assert.equal(asObject(moved.body).position, before.find((tag) => tag.id === tags.Merenda)?.position, "position untouched");
    const after = await tagsOf(coach);
    assert.deepEqual(
      after.map((tag) => [tag.id, tag.position]),
      before.filter((tag) => tag.id !== tags.Merenda).map((tag) => [tag.id, tag.position]),
      "the others keep their order and positions",
    );
  });

  it("counts archived tags in the cap on the coach's tag rows", async () => {
    const { coach } = await newCoach("tag-rows");
    const { database, schema } = setup();
    await tagsOf(coach);
    assert.equal(await storedTagCount(coach), 5);

    // Create-and-archive keeps the live count at five; the rows are filled straight, up to 199.
    const created = await postTag(coach, { name: "Passeggero" });
    assertStatus(created, 201);
    assertStatus(await patchTag(coach, Number(asObject(created.body).id), { archived: true }), 200);
    const archivedRows = Array.from({ length: 199 - 6 }, (_, index) => ({
      coachId: coach.id,
      name: `Vecchio ${index}`,
      position: 0,
      archivedAt: new Date(),
    }));
    await database.db.insert(schema.mealTags).values(archivedRows);
    assert.equal(await storedTagCount(coach), 199);
    assert.equal((await tagsOf(coach)).length, 5, "well under the 30 live tags");

    assertStatus(await postTag(coach, { name: "Il duecentesimo" }), 201);
    assert.equal(await storedTagCount(coach), 200);
    assertError(await postTag(coach, { name: "Il duecentounesimo" }), 409, "Too many meal tags");
    assert.equal(await storedTagCount(coach), 200);
  });

  it("refuses a tag of another coach or a missing tag with the same 404, and the DB refuses it too", async () => {
    const { coachA, coachB, inviteCodeA, tagsA, tagsB } = setup();
    const client = await newClient("foreign-tag", inviteCodeA);

    for (const tagId of [tagsB.Pranzo, 2_147_483_647]) {
      assertError(await putPlan(coachA, client, { meals: [{ tagId, items: [] }] }), 404, "Meal tag not found");
    }
    assert.deepEqual((await getPlan(coachA, client)).body, { mealPlan: null });

    const created = await createPlan(coachA, client, breakfastAndLunch(tagsA));
    const [breakfast] = mealsOf(created);
    const swapped = await putPlan(coachA, client, { meals: [{ id: breakfast.id, tagId: tagsB.Colazione, items: [] }] });
    assertError(swapped, 404, "Meal tag not found");

    // Below the API: the composite FK (tag_id, coach_id) refuses a meal with coach B's tag.
    const { database, schema } = setup();
    await assert.rejects(
      database.db
        .insert(schema.mealPlanMeals)
        .values({ mealPlanId: Number(created.id), coachId: coachA.id, position: 9, tagId: tagsB.Cena }),
    );
    await assert.rejects(
      database.db
        .insert(schema.mealPlanMeals)
        .values({ mealPlanId: Number(created.id), coachId: coachB.id, position: 9, tagId: tagsB.Cena }),
    );
  });

  // Decision 5: day templates, whole replace, no "apply" endpoint.
  it("creates, lists, replaces and deletes templates, each coach seeing only their own", async () => {
    const { coach } = await newCoach("templates");
    const other = await newCoach("templates-other");
    const tags = await tagIdsOf(coach);
    const otherTags = await tagIdsOf(other.coach);

    const standardDay = {
      name: " Giornata standard ",
      meals: [
        { tagId: tags.Colazione, timeOfDay: "07:30" },
        { tagId: tags.Pranzo, timeOfDay: "13:00" },
        { tagId: tags.Cena },
      ],
    };
    const created = await postTemplate(coach, standardDay);
    assertStatus(created, 201);
    assertKeys(created.body, TEMPLATE_KEYS);
    const template = asObject(created.body);
    asList(template.meals).forEach((meal) => assertKeys(meal, TEMPLATE_MEAL_KEYS));
    assert.equal(template.name, "Giornata standard");
    assert.deepEqual(asList(template.meals), [
      { tagId: tags.Colazione, name: "Colazione", timeOfDay: "07:30" },
      { tagId: tags.Pranzo, name: "Pranzo", timeOfDay: "13:00" },
      { tagId: tags.Cena, name: "Cena", timeOfDay: null },
    ]);

    const listed = await getTemplates(coach);
    assertStatus(listed, 200);
    assert.deepEqual(asObject(listed.body).mealPlanTemplates, [template]);
    assert.deepEqual((await getTemplates(other.coach)).body, { mealPlanTemplates: [] });

    await sleep(5);
    const replaced = await putTemplate(coach, template.id, {
      name: "Giornata di gara",
      meals: [{ tagId: tags.Merenda, timeOfDay: "16:00" }, { tagId: tags.Colazione }],
    });
    assertStatus(replaced, 200);
    assert.equal(asObject(replaced.body).id, template.id);
    assert.equal(asObject(replaced.body).createdAt, template.createdAt);
    assert.ok(Date.parse(String(asObject(replaced.body).updatedAt)) > Date.parse(String(template.updatedAt)));
    assert.deepEqual(asList(asObject(replaced.body).meals).map((meal) => meal.name), ["Merenda", "Colazione"]);

    // A rename shows in the template too.
    assertStatus(await patchTag(coach, tags.Merenda, { name: "Merenda pre-gara" }), 200);
    const afterRename = asList(asObject((await getTemplates(coach)).body).mealPlanTemplates);
    assert.deepEqual(asList(afterRename[0].meals).map((meal) => meal.name), ["Merenda pre-gara", "Colazione"]);

    // An archived tag stays where the template has it, but cannot be added.
    assertStatus(await patchTag(coach, tags.Colazione, { archived: true }), 200);
    const keepsArchived = await putTemplate(coach, template.id, {
      name: "Giornata di gara",
      meals: [{ tagId: tags.Colazione }, { tagId: tags.Merenda }],
    });
    assertStatus(keepsArchived, 200);
    const addsArchived = await putTemplate(coach, template.id, {
      name: "Giornata di gara",
      meals: [{ tagId: tags.Colazione }, { tagId: tags.Colazione }],
    });
    assertError(addsArchived, 404, "Meal tag not found");
    assertError(await postTemplate(coach, { name: "Nuova", meals: [{ tagId: tags.Colazione }] }), 404, "Meal tag not found");

    // Another coach: no access to the template, and no use of its tags.
    const body = { name: "Rubata", meals: [{ tagId: otherTags.Pranzo }] };
    assertError(await putTemplate(other.coach, template.id, body), 404, "Meal plan template not found");
    assertError(await deleteTemplate(other.coach, template.id), 404, "Meal plan template not found");
    assertError(await postTemplate(other.coach, { name: "Rubata", meals: [{ tagId: tags.Pranzo }] }), 404, "Meal tag not found");
    assertError(await putTemplate(coach, template.id, body), 404, "Meal tag not found");

    assertError(await postTemplate(coach, { name: "Vuota", meals: [] }), 400, "meals must have at least 1 entry");
    assertError(await postTemplate(coach, { meals: [{ tagId: tags.Pranzo }] }), 400, "name is required");
    assertError(await putTemplate(coach, "abc", standardDay), 400, "Invalid meal plan template id");
    assertError(await deleteTemplate(coach, 0), 400, "Invalid meal plan template id");

    const deleted = await deleteTemplate(coach, template.id);
    assertStatus(deleted, 204);
    assertError(await deleteTemplate(coach, template.id), 404, "Meal plan template not found");
    assertError(await putTemplate(coach, template.id, { name: "X", meals: [{ tagId: tags.Pranzo }] }), 404, "Meal plan template not found");
    assert.deepEqual((await getTemplates(coach)).body, { mealPlanTemplates: [] });

    for (let index = 0; index < 20; index += 1) {
      assertStatus(await postTemplate(coach, { name: `Giornata ${index}`, meals: [{ tagId: tags.Pranzo }] }), 201);
    }
    assertError(await postTemplate(coach, { name: "Di troppo", meals: [{ tagId: tags.Pranzo }] }), 409, "Too many meal plan templates");
  });

  // Schema: a used tag cannot be deleted, but deleting the coach removes everything.
  it("deleting a coach removes their tags, templates and plans; a used tag alone cannot be deleted", async () => {
    const { coach, inviteCode } = await newCoach("deleted");
    const tags = await tagIdsOf(coach);
    const client = await newClient("deleted-client", inviteCode);
    const created = await createPlan(coach, client, breakfastAndLunch(tags));
    assertStatus(await postTemplate(coach, { name: "Standard", meals: [{ tagId: tags.Cena }] }), 201);
    const { database, schema } = setup();

    await assert.rejects(database.db.delete(schema.mealTags).where(eq(schema.mealTags.id, tags.Colazione)));
    await assert.rejects(database.db.delete(schema.mealTags).where(eq(schema.mealTags.id, tags.Cena)));

    await database.db.delete(schema.users).where(eq(schema.users.id, coach.id));

    assert.equal(await storedTagCount(coach), 0);
    const templates = await database.db
      .select({ id: schema.mealPlanTemplates.id })
      .from(schema.mealPlanTemplates)
      .where(eq(schema.mealPlanTemplates.coachId, coach.id));
    assert.equal(templates.length, 0);
    const meals = await database.db
      .select({ id: schema.mealPlanMeals.id })
      .from(schema.mealPlanMeals)
      .where(eq(schema.mealPlanMeals.mealPlanId, Number(created.id)));
    assert.equal(meals.length, 0);
  });
});

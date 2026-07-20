import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { exerciseCatalog } from "../db/schema";

type CatalogSeedRow = {
  id: string;
  name: string;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string | null;
  imageUrl: string | null;
};

function resolveCatalogPath(): string {
  if (process.env.EXERCISE_CATALOG_PATH) {
    return process.env.EXERCISE_CATALOG_PATH;
  }

  const candidates = [
    join(process.cwd(), "data/exercise-catalog.json"),
    join(__dirname, "../../data/exercise-catalog.json"),
  ];

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `Catalog JSON not found. Tried:\n${candidates.map((path) => ` - ${path}`).join("\n")}`,
    );
  }

  return found;
}

function loadCatalogRows(path: string): CatalogSeedRow[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as CatalogSeedRow[];

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Catalog file is empty or invalid: ${path}`);
  }

  return raw.map((row) => ({
    id: row.id,
    name: row.name,
    force: row.force ?? null,
    level: row.level ?? null,
    mechanic: row.mechanic ?? null,
    equipment: row.equipment ?? null,
    primaryMuscles: row.primaryMuscles ?? [],
    secondaryMuscles: row.secondaryMuscles ?? [],
    category: row.category ?? null,
    imageUrl: row.imageUrl ?? null,
  }));
}

async function seedExerciseCatalog() {
  const path = resolveCatalogPath();
  const rows = loadCatalogRows(path);

  console.log(`Seeding ${rows.length} catalog exercise(s) from ${path}`);

  const chunkSize = 100;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);

    await db
      .insert(exerciseCatalog)
      .values(chunk)
      .onConflictDoUpdate({
        target: exerciseCatalog.id,
        set: {
          name: sql`excluded.name`,
          force: sql`excluded.force`,
          level: sql`excluded.level`,
          mechanic: sql`excluded.mechanic`,
          equipment: sql`excluded.equipment`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          category: sql`excluded.category`,
          imageUrl: sql`excluded.image_url`,
        },
      });

    console.log(`Upserted ${Math.min(offset + chunkSize, rows.length)} / ${rows.length}`);
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(exerciseCatalog);

  console.log(`Seed complete. exercise_catalog rows: ${count}`);
}

seedExerciseCatalog()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

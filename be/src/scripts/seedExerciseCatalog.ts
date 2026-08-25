import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { exerciseCatalog } from "../db/schema";
import {
  applyCatalogI18n,
  type CatalogI18nMap,
} from "../services/catalogI18n";

type CatalogSeedRow = {
  id: string;
  name: string;
  nameIt: string | null;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string | null;
  aliases: string[];
  imageUrl: string | null;
  imageUrlEnd: string | null;
};

function resolveDataPath(fileName: string): string | null {
  const candidates = [
    join(process.cwd(), "data", fileName),
    join(__dirname, "../../data", fileName),
  ];

  return candidates.find((path) => existsSync(path)) ?? null;
}

function resolveCatalogPath(): string {
  if (process.env.EXERCISE_CATALOG_PATH) {
    return process.env.EXERCISE_CATALOG_PATH;
  }

  const found = resolveDataPath("exercise-catalog.json");
  if (!found) {
    throw new Error("Catalog JSON not found (data/exercise-catalog.json)");
  }

  return found;
}

function loadI18nOverlay(): CatalogI18nMap {
  if (process.env.EXERCISE_I18N_PATH) {
    return JSON.parse(readFileSync(process.env.EXERCISE_I18N_PATH, "utf8")) as CatalogI18nMap;
  }

  const found = resolveDataPath("exercise-i18n.json");
  if (!found) {
    return {};
  }

  const parsed = JSON.parse(readFileSync(found, "utf8")) as CatalogI18nMap;
  return parsed && typeof parsed === "object" ? parsed : {};
}

function loadCatalogRows(path: string, overlay: CatalogI18nMap): CatalogSeedRow[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Array<{
    id: string;
    name: string;
    force?: string | null;
    level?: string | null;
    mechanic?: string | null;
    equipment?: string | null;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    category?: string | null;
    imageUrl?: string | null;
  }>;

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`Catalog file is empty or invalid: ${path}`);
  }

  return raw.map((row) => {
    const imageUrl = row.imageUrl ?? null;
    const i18n = applyCatalogI18n({ id: row.id, name: row.name, imageUrl }, overlay);

    return {
      id: row.id,
      name: row.name,
      nameIt: i18n.nameIt,
      force: row.force ?? null,
      level: row.level ?? null,
      mechanic: row.mechanic ?? null,
      equipment: row.equipment ?? null,
      primaryMuscles: row.primaryMuscles ?? [],
      secondaryMuscles: row.secondaryMuscles ?? [],
      category: row.category ?? null,
      aliases: i18n.aliases,
      imageUrl,
      imageUrlEnd: i18n.imageUrlEnd,
    };
  });
}

async function seedExerciseCatalog() {
  const path = resolveCatalogPath();
  const overlay = loadI18nOverlay();
  const rows = loadCatalogRows(path, overlay);

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
          nameIt: sql`excluded.name_it`,
          force: sql`excluded.force`,
          level: sql`excluded.level`,
          mechanic: sql`excluded.mechanic`,
          equipment: sql`excluded.equipment`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          category: sql`excluded.category`,
          aliases: sql`excluded.aliases`,
          imageUrl: sql`excluded.image_url`,
          imageUrlEnd: sql`excluded.image_url_end`,
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

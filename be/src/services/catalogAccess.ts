import { and, asc, count, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { exerciseCatalog } from "../db/schema";
import {
  parseCatalogSearchInput,
  toCatalogExercise,
  type CatalogExercise,
  type CatalogFacets,
  type CatalogSearchInput,
} from "./catalogSearch";

function buildWhere(params: ReturnType<typeof parseCatalogSearchInput>): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.q) {
    conditions.push(ilike(exerciseCatalog.name, `%${params.q}%`));
  }

  if (params.muscle) {
    conditions.push(
      sql`exists (
        select 1
        from jsonb_array_elements_text(${exerciseCatalog.primaryMuscles}) as muscle
        where lower(muscle) = ${params.muscle}
      )`,
    );
  }

  if (params.equipment) {
    conditions.push(sql`lower(${exerciseCatalog.equipment}) = ${params.equipment}`);
  }

  if (params.level) {
    conditions.push(sql`lower(${exerciseCatalog.level}) = ${params.level}`);
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
}

export async function searchExerciseCatalog(input: CatalogSearchInput): Promise<{
  items: CatalogExercise[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = parseCatalogSearchInput(input);
  const where = buildWhere(params);

  const [totalRow] = await db
    .select({ total: count() })
    .from(exerciseCatalog)
    .where(where);

  const rows = await db
    .select()
    .from(exerciseCatalog)
    .where(where)
    .orderBy(asc(exerciseCatalog.name))
    .limit(params.limit)
    .offset(params.offset);

  return {
    items: rows.map(toCatalogExercise),
    total: Number(totalRow?.total ?? 0),
    limit: params.limit,
    offset: params.offset,
  };
}

export async function getExerciseCatalogById(id: string): Promise<CatalogExercise | null> {
  const [row] = await db.select().from(exerciseCatalog).where(eq(exerciseCatalog.id, id));
  return row ? toCatalogExercise(row) : null;
}

export async function getExerciseCatalogFacets(): Promise<CatalogFacets> {
  const rows = await db
    .select({
      primaryMuscles: exerciseCatalog.primaryMuscles,
      equipment: exerciseCatalog.equipment,
      level: exerciseCatalog.level,
    })
    .from(exerciseCatalog);

  const muscles = new Set<string>();
  const equipment = new Set<string>();
  const levels = new Set<string>();

  for (const row of rows) {
    const primary = Array.isArray(row.primaryMuscles) ? row.primaryMuscles : [];
    for (const muscle of primary) {
      if (typeof muscle === "string" && muscle.length > 0) {
        muscles.add(muscle);
      }
    }

    if (row.equipment) {
      equipment.add(row.equipment);
    }

    if (row.level) {
      levels.add(row.level);
    }
  }

  return {
    muscles: [...muscles].sort((a, b) => a.localeCompare(b)),
    equipment: [...equipment].sort((a, b) => a.localeCompare(b)),
    levels: [...levels].sort((a, b) => a.localeCompare(b)),
  };
}

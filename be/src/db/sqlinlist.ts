import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * `column IN ('a', 'b')` for a CHECK constraint, built from the same constant the
 * code uses, so adding a value to the list cannot leave the database behind.
 * Values are our own constants, never user input, so they are inlined as literals.
 */
export const sqlInList = (column: AnyPgColumn, values: readonly string[]): SQL => {
  const quotedValues = values.map((value) => `'${value}'`).join(", ");

  return sql`${column} IN (${sql.raw(quotedValues)})`;
};

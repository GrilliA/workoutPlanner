// Postgres `integer`: a larger id cannot exist, and the API would refuse it.
const MAX_DATABASE_ID = 2_147_483_647;

export function isDatabaseId(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_DATABASE_ID;
}

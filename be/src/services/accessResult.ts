import type { db } from "../db";

/** A refusal the route turns into its status and `{ error }` body. */
export type Failure = { ok: false; status: 404 | 409; error: string };

export type Result<T> = { ok: true; value: T } | Failure;

/** What a read needs: the `db` itself or a transaction, so one builder serves both. */
export type Reader = Pick<typeof db, "select">;

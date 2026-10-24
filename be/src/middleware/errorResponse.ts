import { DrizzleQueryError } from "drizzle-orm";

type ErrorResponse = {
  status: number;
  body: { error: string };
  log: unknown;
};

// body-parser and raw-body build their errors with http-errors and tag them with a `type`.
type BodyParserError = { type: string; status: number; expose?: unknown };

const INTERNAL_ERROR = { error: "Internal server error" };

const CLIENT_ERROR_MESSAGES: Record<number, string> = {
  413: "Request body too large",
  415: "Unsupported request body encoding",
};

const isBodyParserError = (err: unknown): err is BodyParserError =>
  typeof err === "object" &&
  err !== null &&
  "type" in err &&
  typeof err.type === "string" &&
  "status" in err &&
  typeof err.status === "number";

// Postgres fields that say what failed without quoting a value. `message` and `detail` can quote one:
// `invalid input syntax for type uuid: "…"`, `Key (email)=(…) already exists.`
const DATABASE_ERROR_FIELDS = ["code", "table", "column", "constraint"];

// A stack starts with `name: message`. Cut that exact text: a value can itself hold a line like `    at …`.
const stackFrames = (err: Error) => {
  const header = `${err.name}: ${err.message}`;

  if (!err.stack?.startsWith(header)) {
    return [];
  }

  return err.stack
    .slice(header.length)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
};

/**
 * Drizzle writes the query params into `message`, and so into `stack`: emails, password hashes, tokens.
 * Its log keeps the query with placeholders, where the code failed and what Postgres rejected.
 */
const errorLogWithoutParams = (err: unknown) => {
  if (!(err instanceof DrizzleQueryError)) {
    return err;
  }

  const causeFields = err.cause ? Object.entries(err.cause) : [];
  const databaseFields = causeFields.filter(([field]) => DATABASE_ERROR_FIELDS.includes(field));

  return {
    name: "DrizzleQueryError",
    query: err.query,
    stack: stackFrames(err),
    cause: Object.fromEntries(databaseFields),
  };
};

/**
 * What the global error handler sends and logs.
 * A rejected body (malformed JSON, or a primitive in strict mode) is the client's fault, never a 500.
 */
export const errorResponse = (err: unknown): ErrorResponse => {
  if (!isBodyParserError(err)) {
    return { status: 500, body: INTERNAL_ERROR, log: errorLogWithoutParams(err) };
  }

  // Never the error itself: it keeps the raw body, and a JSON.parse message can quote it
  // (a password sent to /auth/login).
  const log = { type: err.type, status: err.status };
  const isClientError = err.expose === true && err.status >= 400 && err.status < 500;

  if (!isClientError) {
    return { status: 500, body: INTERNAL_ERROR, log };
  }

  const error = CLIENT_ERROR_MESSAGES[err.status] ?? "Invalid request body";

  return { status: err.status, body: { error }, log };
};

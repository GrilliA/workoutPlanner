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

/**
 * What the global error handler sends and logs.
 * A rejected body (malformed JSON, or a primitive in strict mode) is the client's fault, never a 500.
 */
export const errorResponse = (err: unknown): ErrorResponse => {
  if (!isBodyParserError(err)) {
    return { status: 500, body: INTERNAL_ERROR, log: err };
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

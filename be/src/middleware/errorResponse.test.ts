import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DrizzleQueryError } from "drizzle-orm";
import { DatabaseError } from "pg";
import { errorResponse } from "./errorResponse";

// The last one is free text that looks like a stack frame.
const SIGNUP_PARAMS = [
  "coach@example.com",
  "$2b$10$abcdefghijklmnopqrstuuSecretHashValue1234567890abcd",
  "reset-token-9f8e7d",
  "nota\n    at palestra",
];
const PARAM_VALUES = ["coach@example.com", "SecretHashValue", "reset-token-9f8e7d", "at palestra"];

// Shaped like the error pg throws for a unique violation: `detail` quotes the value.
const uniqueViolation = () =>
  Object.assign(
    new DatabaseError('duplicate key value violates unique constraint "users_email_unique"', 120, "error"),
    {
      code: "23505",
      table: "users",
      constraint: "users_email_unique",
      detail: "Key (email)=(coach@example.com) already exists.",
    },
  );

const LOGIN_BODY = '{"email":"coach@example.com","password":hunter2}';

// Shaped like the http-errors that body-parser passes to `next`.
const parserError = (fields: { status: number; type: string; expose: boolean }) =>
  Object.assign(new Error("parser message"), { statusCode: fields.status, ...fields });

describe("errorResponse", () => {
  it("turns a body the JSON parser rejects into 400 and logs neither body nor message", () => {
    const syntaxError = Object.assign(
      new SyntaxError(`Unexpected token 'h', "${LOGIN_BODY}" is not valid JSON`),
      { status: 400, statusCode: 400, expose: true, type: "entity.parse.failed", body: LOGIN_BODY },
    );

    const response = errorResponse(syntaxError);

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Invalid request body" });
    assert.deepEqual(response.log, { type: "entity.parse.failed", status: 400 });
    assert.equal(JSON.stringify(response.log).includes("hunter2"), false);
  });

  it("keeps the status of other client errors of the parser with a fixed message", () => {
    const tooLarge = errorResponse(parserError({ status: 413, type: "entity.too.large", expose: true }));
    const charset = errorResponse(
      parserError({ status: 415, type: "charset.unsupported", expose: true }),
    );
    const aborted = errorResponse(parserError({ status: 400, type: "request.aborted", expose: true }));

    assert.deepEqual(
      [tooLarge, charset, aborted].map(({ status, body }) => ({ status, body })),
      [
        { status: 413, body: { error: "Request body too large" } },
        { status: 415, body: { error: "Unsupported request body encoding" } },
        { status: 400, body: { error: "Invalid request body" } },
      ],
    );
    assert.deepEqual(tooLarge.log, { type: "entity.too.large", status: 413 });
  });

  it("answers 500 to a parser error it must not expose, still logging only type and status", () => {
    const response = errorResponse(
      parserError({ status: 500, type: "stream.not.readable", expose: false }),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Internal server error" });
    assert.deepEqual(response.log, { type: "stream.not.readable", status: 500 });
  });

  it("answers 500 to a failed Drizzle query and logs the query and Postgres fields, never the params", () => {
    const query = 'insert into "users" ("email", "password_hash", "reset_token", "note") values ($1, $2, $3, $4)';
    const queryError = new DrizzleQueryError(query, SIGNUP_PARAMS, uniqueViolation());

    const response = errorResponse(queryError);
    const loggedText = JSON.stringify(response.log);
    const leakedValues = PARAM_VALUES.filter((value) => loggedText.includes(value));
    const log = response.log as { name: string; query: string; stack: string[]; cause: unknown };

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Internal server error" });
    assert.deepEqual(leakedValues, []);
    assert.deepEqual({ name: log.name, query: log.query, cause: log.cause }, {
      name: "DrizzleQueryError",
      query,
      cause: { code: "23505", table: "users", constraint: "users_email_unique" },
    });
    assert.match(log.stack[0] ?? "", /^at .*errorResponse\.test\.ts/);
  });

  it("drops the stack of a failed Drizzle query when it does not start with the message", () => {
    const queryError = new DrizzleQueryError("select 1", SIGNUP_PARAMS);
    queryError.stack = `Error: ${SIGNUP_PARAMS[0]}`;

    const response = errorResponse(queryError);

    assert.deepEqual(response.log, { name: "DrizzleQueryError", query: "select 1", stack: [], cause: {} });
  });

  it("answers 500 to any other error and logs it whole, cause included", () => {
    const databaseError = Object.assign(new Error("Failed query"), {
      cause: new Error("connection refused"),
    });
    const thrownString = "boom";

    const fromDatabase = errorResponse(databaseError);
    const fromString = errorResponse(thrownString);

    assert.equal(fromDatabase.status, 500);
    assert.deepEqual(fromDatabase.body, { error: "Internal server error" });
    assert.equal(fromDatabase.log, databaseError);
    assert.equal(fromString.status, 500);
    assert.equal(fromString.log, thrownString);
  });
});

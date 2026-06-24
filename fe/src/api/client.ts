import { z } from "zod";
import { API_BASE } from "./config";
import { apiErrorSchema } from "./schemas";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions<TResponse> = {
  method?: string;
  body?: unknown;
  requestSchema?: z.ZodType;
  schema: z.ZodType<TResponse>;
};

export async function apiRequest<TResponse>(
  path: string,
  { method = "GET", body, requestSchema, schema }: RequestOptions<TResponse>,
): Promise<TResponse> {
  const headers = new Headers({ Accept: "application/json" });
  let encodedBody: string | undefined;

  if (body !== undefined) {
    const payload = requestSchema ? requestSchema.parse(body) : body;
    encodedBody = JSON.stringify(payload);
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: encodedBody,
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : "Request failed",
    );
  }

  return schema.parse(json);
}

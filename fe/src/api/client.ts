import { z } from "zod";
import { API_BASE } from "./config";
import { apiErrorSchema } from "./schemas";
import { accessTokenSchema } from "./schemas/auth";
import { authStore } from "@auth/authStore";

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

const AUTH_PATH_PREFIX = "/auth/";

const isAuthPath = (path: string): boolean => path.startsWith(AUTH_PATH_PREFIX);

const parseJsonBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as unknown;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessTokenDirect = async (): Promise<string | null> => {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const json: unknown = await response.json();
  const { accessToken } = accessTokenSchema.parse(json);
  return accessToken;
};

const tryRefreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenDirect()
      .then((accessToken) => {
        if (accessToken) {
          authStore.setAccessToken(accessToken);
        }
        return accessToken;
      })
      .catch(() => {
        authStore.clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

async function sendRequest<TResponse>(
  path: string,
  options: RequestOptions<TResponse>,
  isRetry = false,
): Promise<TResponse> {
  const { method = "GET", body, requestSchema, schema } = options;
  const headers = new Headers({ Accept: "application/json" });
  let encodedBody: string | undefined;

  if (body !== undefined) {
    const payload = requestSchema ? requestSchema.parse(body) : body;
    encodedBody = JSON.stringify(payload);
    headers.set("Content-Type", "application/json");
  }

  const accessToken = authStore.getAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: encodedBody,
    credentials: "include",
  });

  if (
    response.status === 401 &&
    !isRetry &&
    !isAuthPath(path)
  ) {
    const newToken = await tryRefreshAccessToken();

    if (newToken) {
      return sendRequest(path, options, true);
    }
  }

  const json = await parseJsonBody(response);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : "Request failed",
    );
  }

  return schema.parse(json);
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions<TResponse>,
): Promise<TResponse> {
  return sendRequest(path, options);
}

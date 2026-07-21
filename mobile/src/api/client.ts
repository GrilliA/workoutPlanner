import { z } from "zod";
import { API_BASE, MOBILE_CLIENT_HEADER } from "./config";
import { apiErrorSchema } from "./schemas";
import { accessTokenSchema } from "./schemas/auth";
import { authStore } from "../auth/authStore";

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
  const refreshToken = authStore.getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Client": MOBILE_CLIENT_HEADER,
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.status === 401) {
    authStore.clear();
    return null;
  }

  if (!response.ok) {
    const json = await parseJsonBody(response);
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : "Request failed",
    );
  }

  const json: unknown = await response.json();
  const tokens = accessTokenSchema.parse(json);

  if (tokens.refreshToken) {
    await authStore.setRefreshToken(tokens.refreshToken);
  }

  return tokens.accessToken;
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenDirect()
      .then((token) => {
        if (token) {
          authStore.setAccessToken(token);
        }
        return token;
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
  const headers = new Headers({
    Accept: "application/json",
    "X-Client": MOBILE_CLIENT_HEADER,
  });
  let encodedBody: string | undefined;

  if (body !== undefined) {
    if (requestSchema) {
      const parsedBody = requestSchema.safeParse(body);

      if (!parsedBody.success) {
        const detail = parsedBody.error.issues[0]?.message ?? "dati non validi";
        throw new ApiError(400, detail);
      }

      encodedBody = JSON.stringify(parsedBody.data);
    } else {
      encodedBody = JSON.stringify(body);
    }

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
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : "network error";
    throw new ApiError(0, `Rete: ${detail}`);
  });

  if (response.status === 401 && !isRetry && !isAuthPath(path)) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      return sendRequest(path, options, true);
    }

    authStore.clear();
  }

  const json = await parseJsonBody(response);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : "Request failed",
    );
  }

  const decoded = schema.safeParse(json);

  if (!decoded.success) {
    throw new ApiError(response.status, "Risposta API non valida");
  }

  return decoded.data;
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions<TResponse>,
): Promise<TResponse> {
  return sendRequest(path, options);
}

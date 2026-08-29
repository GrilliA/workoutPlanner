import { z } from "zod";
import { API_BASE } from "./config";
import { apiErrorSchema } from "./schemas";
import { accessTokenSchema } from "./schemas/auth";
import { authStore } from "@auth/authStore";

const UNKNOWN_ERROR_MESSAGE = "Richiesta non riuscita";
const INVALID_RESPONSE_MESSAGE = "Risposta API non valida";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  static messageFrom(err: unknown, fallback: string): string {
    if (!(err instanceof ApiError)) {
      return fallback;
    }

    if (err.status === 0) {
      return "Connessione non disponibile";
    }

    if (err.status === 401) {
      return "Sessione scaduta. Accedi di nuovo.";
    }

    if (err.status >= 500) {
      return "Errore del server. Riprova.";
    }

    return err.message.trim() !== "" ? err.message : fallback;
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

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(response.status, INVALID_RESPONSE_MESSAGE);
  }
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessTokenDirect = async (): Promise<string | null> => {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  }).catch(() => {
    throw new ApiError(0, "Connessione non disponibile");
  });

  if (response.status === 401) {
    authStore.clear();
    return null;
  }

  const json = await parseJsonBody(response);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data.error : UNKNOWN_ERROR_MESSAGE,
    );
  }

  const parsed = accessTokenSchema.safeParse(json);

  if (!parsed.success) {
    throw new ApiError(response.status, INVALID_RESPONSE_MESSAGE);
  }

  return parsed.data.accessToken;
};

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenDirect()
      .then((accessToken) => {
        if (accessToken) {
          authStore.setAccessToken(accessToken);
        }
        return accessToken;
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
    credentials: "include",
  }).catch(() => {
    throw new ApiError(0, "Connessione non disponibile");
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
      parsed.success ? parsed.data.error : UNKNOWN_ERROR_MESSAGE,
    );
  }

  const decoded = schema.safeParse(json);

  if (!decoded.success) {
    throw new ApiError(response.status, INVALID_RESPONSE_MESSAGE);
  }

  return decoded.data;
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions<TResponse>,
): Promise<TResponse> {
  return sendRequest(path, options);
}

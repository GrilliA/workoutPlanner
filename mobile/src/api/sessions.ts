import { apiRequest } from "./client";
import { CACHE_SHORT } from "./responseCache";
import {
  patchSessionRequestSchema,
  sessionHistoryResponseSchema,
  startSessionRequestSchema,
  workoutSessionSummariesSchema,
  workoutSessionWithSetsSchema,
  workoutSessionsSchema,
  type PatchSessionInput,
  type StartSessionInput,
  type WorkoutSession,
  type WorkoutSessionSummary,
  type WorkoutSessionWithSets,
  type SessionHistoryResponse,
} from "./schemas";

export async function startSession(
  workoutId: number,
  input: StartSessionInput = {},
): Promise<WorkoutSessionWithSets> {
  return apiRequest(`/workouts/${workoutId}/sessions`, {
    method: "POST",
    body: input,
    requestSchema: startSessionRequestSchema,
    schema: workoutSessionWithSetsSchema,
  });
}

export async function getSessionsByWorkout(workoutId: number): Promise<WorkoutSession[]> {
  return apiRequest(`/workouts/${workoutId}/sessions`, {
    schema: workoutSessionsSchema,
    cache: CACHE_SHORT,
  });
}

export async function getSessions(): Promise<WorkoutSessionSummary[]> {
  return apiRequest("/sessions", { schema: workoutSessionSummariesSchema });
}

export async function getSession(id: number): Promise<WorkoutSessionWithSets> {
  return apiRequest(`/sessions/${id}`, { schema: workoutSessionWithSetsSchema });
}

export async function getSessionHistory(
  params: { page?: number; limit?: number } = {},
): Promise<SessionHistoryResponse> {
  const search = new URLSearchParams();

  if (params.page !== undefined) {
    search.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }

  const query = search.toString();

  return apiRequest(`/sessions/history${query ? `?${query}` : ""}`, {
    schema: sessionHistoryResponseSchema,
  });
}

export async function patchSession(
  id: number,
  input: PatchSessionInput,
): Promise<WorkoutSessionWithSets> {
  return apiRequest(`/sessions/${id}`, {
    method: "PATCH",
    body: input,
    requestSchema: patchSessionRequestSchema,
    schema: workoutSessionWithSetsSchema,
  });
}

export async function abandonSession(id: number): Promise<WorkoutSessionWithSets> {
  return patchSession(id, { status: "abandoned" });
}


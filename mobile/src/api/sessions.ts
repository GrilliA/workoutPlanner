import { z } from "zod";
import { apiRequest } from "./client";
import {
  logSetRequestSchema,
  loggedSetSchema,
  patchLoggedSetRequestSchema,
  patchSessionRequestSchema,
  sessionHistoryResponseSchema,
  startSessionRequestSchema,
  workoutSessionSummariesSchema,
  workoutSessionWithSetsSchema,
  workoutSessionsSchema,
  type LogSetInput,
  type PatchLoggedSetInput,
  type PatchSessionInput,
  type StartSessionInput,
  type LoggedSet,
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

export async function completeSession(id: number): Promise<WorkoutSessionWithSets> {
  return patchSession(id, { status: "completed" });
}

export async function abandonSession(id: number): Promise<WorkoutSessionWithSets> {
  return patchSession(id, { status: "abandoned" });
}

export async function logSet(sessionId: number, input: LogSetInput): Promise<LoggedSet> {
  return apiRequest(`/sessions/${sessionId}/sets`, {
    method: "POST",
    body: input,
    requestSchema: logSetRequestSchema,
    schema: loggedSetSchema,
  });
}

export async function patchLoggedSet(
  sessionId: number,
  setId: number,
  input: PatchLoggedSetInput,
): Promise<LoggedSet> {
  return apiRequest(`/sessions/${sessionId}/sets/${setId}`, {
    method: "PATCH",
    body: input,
    requestSchema: patchLoggedSetRequestSchema,
    schema: loggedSetSchema,
  });
}

export async function deleteLoggedSet(sessionId: number, setId: number): Promise<void> {
  await apiRequest(`/sessions/${sessionId}/sets/${setId}`, {
    method: "DELETE",
    schema: z.undefined(),
  });
}

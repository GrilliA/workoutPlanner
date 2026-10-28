import { z } from "zod";
import { apiRequest } from "./client";
import {
  coachAssignmentSchema,
  coachAssignmentsSchema,
  coachClientDetailSchema,
  coachClientsSchema,
  coachInviteCodeSchema,
  coachTemplatesSchema,
  coachTodaySchema,
  okResponseSchema,
  resetPasswordRequestSchema,
  updateAssignmentDatesRequestSchema,
  type CreateAssignmentInput,
  type ResetPasswordInput,
  type UpdateAssignmentDatesInput,
} from "./schemas/coach";
import {
  workoutDetailSchema,
  workoutProgramRequestSchema,
  workoutSchema,
  type WorkoutProgramInput,
} from "./schemas/workout";

export const getCoachToday = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiRequest("/coach/today", { schema: coachTodaySchema, signal });

/** Hides the client's row of Oggi for 7 days; the server computes the severity it remembers. */
export const markClientHandled = (athleteId: number) =>
  apiRequest(`/coach/today/${athleteId}/handled`, {
    method: "POST",
    schema: z.undefined(),
  });

/** Undoes "Gestito": the row comes back on the next read. */
export const unmarkClientHandled = (athleteId: number) =>
  apiRequest(`/coach/today/${athleteId}/handled`, {
    method: "DELETE",
    schema: z.undefined(),
  });

export const getCoachClients = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiRequest("/coach/clients", { schema: coachClientsSchema, signal });

export const getCoachInviteCode = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiRequest("/coach/invite-code", { schema: coachInviteCodeSchema, signal });

export const rotateCoachInviteCode = () =>
  apiRequest("/coach/invite-code/rotate", {
    method: "POST",
    schema: coachInviteCodeSchema,
  });

export const getCoachClient = (
  athleteId: number,
  { signal }: { signal?: AbortSignal } = {},
) =>
  apiRequest(`/coach/clients/${athleteId}`, {
    schema: coachClientDetailSchema,
    signal,
  });

export const getCoachTemplates = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiRequest("/coach/templates", { schema: coachTemplatesSchema, signal });

export const getCoachTemplate = (
  id: number,
  { signal }: { signal?: AbortSignal } = {},
) =>
  apiRequest(`/coach/templates/${id}`, { schema: workoutDetailSchema, signal });

export const saveCoachTemplateProgram = (input: WorkoutProgramInput) =>
  apiRequest("/coach/templates/program", {
    method: "POST",
    body: workoutProgramRequestSchema.parse(input),
    schema: workoutSchema,
  });

export const updateCoachTemplateProgram = (id: number, input: WorkoutProgramInput) =>
  apiRequest(`/coach/templates/${id}/program`, {
    method: "PUT",
    body: workoutProgramRequestSchema.parse(input),
    schema: workoutSchema,
  });

export const getCoachAssignments = ({ signal }: { signal?: AbortSignal } = {}) =>
  apiRequest("/coach/assignments", { schema: coachAssignmentsSchema, signal });

export const createCoachAssignment = (input: CreateAssignmentInput) =>
  apiRequest("/coach/assignments", {
    method: "POST",
    body: input,
    schema: z.object({
      assignment: coachAssignmentSchema,
      workout: z
        .object({
          id: z.number(),
          name: z.string(),
        })
        .passthrough(),
    }),
  });

export const revokeCoachAssignment = (id: number) =>
  apiRequest(`/coach/assignments/${id}/revoke`, {
    method: "POST",
    schema: coachAssignmentSchema,
  });

export const updateCoachAssignment = (
  id: number,
  input: UpdateAssignmentDatesInput,
) =>
  apiRequest(`/coach/assignments/${id}`, {
    method: "PATCH",
    body: updateAssignmentDatesRequestSchema.parse(input),
    schema: coachAssignmentSchema,
  });

export const resetCoachClientPassword = (
  athleteId: number,
  input: ResetPasswordInput,
) =>
  apiRequest(`/coach/clients/${athleteId}/reset-password`, {
    method: "POST",
    body: resetPasswordRequestSchema.parse(input),
    schema: okResponseSchema,
  });

export const unlinkCoachClient = (athleteId: number) =>
  apiRequest(`/coach/clients/${athleteId}`, {
    method: "DELETE",
    schema: okResponseSchema,
  });

export const getCoachClientProgram = (
  athleteId: number,
  workoutId: number,
  { signal }: { signal?: AbortSignal } = {},
) =>
  apiRequest(`/coach/clients/${athleteId}/programs/${workoutId}`, {
    schema: workoutDetailSchema,
    signal,
  });

export const updateCoachClientProgram = (
  athleteId: number,
  workoutId: number,
  input: WorkoutProgramInput,
) =>
  apiRequest(`/coach/clients/${athleteId}/programs/${workoutId}`, {
    method: "PUT",
    body: workoutProgramRequestSchema.parse(input),
    schema: workoutSchema,
  });

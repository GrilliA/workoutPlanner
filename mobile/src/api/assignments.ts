import { z } from "zod";
import { apiRequest } from "./client";
import { CACHE_SHORT } from "./responseCache";
import {
  activeAssignmentResponseSchema,
  activeAssignmentSchema,
  type ActiveAssignment,
} from "./schemas/assignment";

const revokedAssignmentSchema = activeAssignmentSchema
  .partial({ workoutName: true, isActive: true })
  .passthrough();

export async function getActiveAssignment(): Promise<ActiveAssignment | null> {
  const response = await apiRequest("/assignments/active", {
    schema: activeAssignmentResponseSchema,
    cache: CACHE_SHORT,
  });
  return response.assignment;
}

export async function revokeActiveAssignment() {
  return apiRequest("/assignments/active/revoke", {
    method: "POST",
    schema: revokedAssignmentSchema,
  });
}

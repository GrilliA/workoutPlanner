import { apiRequest } from "./client";
import {
  activeAssignmentResponseSchema,
  type ActiveAssignment,
} from "./schemas/assignment";

export async function getActiveAssignment(): Promise<ActiveAssignment | null> {
  const response = await apiRequest("/assignments/active", {
    schema: activeAssignmentResponseSchema,
  });
  return response.assignment;
}

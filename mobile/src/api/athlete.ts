import { z } from "zod";
import { apiRequest } from "./client";

export const athleteCoachSchema = z.object({
  coachId: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  linkedAt: z.coerce.string(),
});

export const athleteCoachResponseSchema = z.object({
  coach: athleteCoachSchema.nullable(),
});

export type AthleteCoach = z.infer<typeof athleteCoachSchema>;

export function getAthleteCoach() {
  return apiRequest("/athlete/coach", { schema: athleteCoachResponseSchema });
}

export function linkAthleteCoach(code: string) {
  return apiRequest("/athlete/coach/link", {
    method: "POST",
    body: { code },
    schema: z.object({ coach: athleteCoachSchema }),
  });
}

export function unlinkAthleteCoach() {
  return apiRequest("/athlete/coach", {
    method: "DELETE",
    schema: z.object({ ok: z.literal(true) }),
  });
}

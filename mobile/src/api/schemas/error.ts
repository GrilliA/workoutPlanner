import { z } from "zod";

export const apiErrorSchema = z.object({
  error: z.string(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

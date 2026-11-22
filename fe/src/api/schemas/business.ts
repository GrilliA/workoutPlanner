import { z } from "zod";

// docs/contracts/pt-business.md
export const businessRangeSchema = z.enum(["6m", "12m"]);
export type BusinessRange = z.infer<typeof businessRangeSchema>;

const collectedMonthSchema = z.object({
  month: z.string(),
  amountCents: z.number(),
});

const lostMonthSchema = z.object({
  month: z.string(),
  count: z.number(),
});

export const coachBusinessSchema = z.object({
  range: businessRangeSchema,
  today: z.string(),
  subscriptionCount: z.number(),
  monthlyRecurringCents: z.number(),
  recurringClientCount: z.number(),
  expectedNext30DaysCents: z.number(),
  collectedByMonth: z.array(collectedMonthSchema),
  renewals90Days: z.object({ due: z.number(), renewed: z.number() }),
  lostByMonth: z.array(lostMonthSchema),
});
export type CoachBusiness = z.infer<typeof coachBusinessSchema>;

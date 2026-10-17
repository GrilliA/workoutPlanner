import { eq } from "drizzle-orm";
import { db } from "../db";
import type { NewWaitlistSignup } from "./validate";
import { waitlistSignups } from "./schema";

export const insertWaitlistSignup = async (
  signup: NewWaitlistSignup,
): Promise<"created" | "duplicate"> => {
  const inserted = await db
    .insert(waitlistSignups)
    .values({
      email: signup.email,
      role: signup.role,
      ref: signup.ref,
      consentedAt: signup.consentedAt,
    })
    .onConflictDoNothing({ target: waitlistSignups.email })
    .returning({ id: waitlistSignups.id });

  if (inserted.length === 0) {
    return "duplicate";
  }
  return "created";
};

export const markWaitlistWelcomeSent = async (email: string, sentAt: Date): Promise<void> => {
  await db
    .update(waitlistSignups)
    .set({ welcomeSentAt: sentAt })
    .where(eq(waitlistSignups.email, email));
};

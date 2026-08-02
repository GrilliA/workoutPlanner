import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { coachAthletes, coachInviteCodes, users } from "../db/schema";
import { unlinkCoachAthlete } from "./coachAthleteAccess";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export const generateInviteCode = (): string => {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
};

export const getOrCreateCoachInviteCode = async (coachId: number) => {
  const [existing] = await db
    .select()
    .from(coachInviteCodes)
    .where(eq(coachInviteCodes.coachId, coachId))
    .limit(1);

  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    try {
      const [created] = await db
        .insert(coachInviteCodes)
        .values({ coachId, code })
        .returning();
      if (created) {
        return created;
      }
    } catch {
      // retry on unique collision
    }
  }

  throw new Error("Failed to generate invite code");
};

export const rotateCoachInviteCode = async (coachId: number) => {
  await getOrCreateCoachInviteCode(coachId);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    try {
      const [updated] = await db
        .update(coachInviteCodes)
        .set({ code, updatedAt: new Date() })
        .where(eq(coachInviteCodes.coachId, coachId))
        .returning();
      if (updated) {
        return updated;
      }
    } catch {
      // retry
    }
  }

  throw new Error("Failed to rotate invite code");
};

export const findCoachByInviteCode = async (rawCode: string) => {
  const code = rawCode.trim().toUpperCase();
  if (code.length < 4) {
    return null;
  }

  const [row] = await db
    .select({
      coachId: coachInviteCodes.coachId,
      code: coachInviteCodes.code,
      email: users.email,
      name: users.name,
    })
    .from(coachInviteCodes)
    .innerJoin(users, eq(coachInviteCodes.coachId, users.id))
    .where(and(eq(coachInviteCodes.code, code), eq(users.role, "coach")))
    .limit(1);

  return row ?? null;
};

export const getAthleteCoach = async (athleteId: number) => {
  const [row] = await db
    .select({
      coachId: users.id,
      email: users.email,
      name: users.name,
      linkedAt: coachAthletes.createdAt,
    })
    .from(coachAthletes)
    .innerJoin(users, eq(coachAthletes.coachId, users.id))
    .where(eq(coachAthletes.athleteId, athleteId))
    .limit(1);

  return row ?? null;
};

export const linkAthleteToCoachByCode = async (
  athleteId: number,
  rawCode: string,
): Promise<
  | { ok: true; coach: NonNullable<Awaited<ReturnType<typeof getAthleteCoach>>> }
  | { ok: false; status: number; error: string }
> => {
  const existing = await getAthleteCoach(athleteId);
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: "Already linked to a coach. Unlink first to join another.",
    };
  }

  const invite = await findCoachByInviteCode(rawCode);
  if (!invite) {
    return { ok: false, status: 404, error: "Invalid invite code" };
  }

  try {
    await db.insert(coachAthletes).values({
      coachId: invite.coachId,
      athleteId,
    });
  } catch {
    return {
      ok: false,
      status: 409,
      error: "Already linked to a coach. Unlink first to join another.",
    };
  }

  const coach = await getAthleteCoach(athleteId);
  if (!coach) {
    return { ok: false, status: 500, error: "Failed to link coach" };
  }

  return { ok: true, coach };
};

export const unlinkAthleteFromCoach = async (athleteId: number) => {
  const coach = await getAthleteCoach(athleteId);
  if (!coach) {
    return null;
  }
  return unlinkCoachAthlete(coach.coachId, athleteId);
};

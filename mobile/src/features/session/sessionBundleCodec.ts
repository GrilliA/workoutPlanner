import { z } from "zod";
import { exerciseSchema, type Exercise } from "../../api/schemas/exercise";
import {
  loggedSetSchema,
  workoutSessionWithSetsSchema,
  type LoggedSet,
  type WorkoutSessionWithSets,
} from "../../api/schemas/session";
import { groupSetsByExercise } from "./groupSetsByExercise";

/** Everything the session screen needs to open without network. */
export type SessionBundle = {
  session: WorkoutSessionWithSets;
  workoutName: string;
  defaultRestSec: number;
  exercises: Exercise[];
  previousByExercise: Map<number, LoggedSet[]>;
};

const storedBundleSchema = z.object({
  session: workoutSessionWithSetsSchema,
  workoutName: z.string(),
  defaultRestSec: z.number(),
  exercises: z.array(exerciseSchema),
  previousSets: z.array(loggedSetSchema),
});

export function encodeSessionBundle(bundle: SessionBundle): string {
  return JSON.stringify({
    session: bundle.session,
    workoutName: bundle.workoutName,
    defaultRestSec: bundle.defaultRestSec,
    exercises: bundle.exercises,
    previousSets: [...bundle.previousByExercise.values()].flat(),
  });
}

/** A file for another session, from an older app or half written reads as none. */
export function decodeSessionBundle(
  text: string,
  sessionId: number,
): SessionBundle | null {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = storedBundleSchema.safeParse(json);

  if (!parsed.success || parsed.data.session.id !== sessionId) {
    return null;
  }

  const { previousSets, ...rest } = parsed.data;
  return { ...rest, previousByExercise: groupSetsByExercise(previousSets) };
}

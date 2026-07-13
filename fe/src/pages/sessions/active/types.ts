export type SetRowStatus = "pending" | "active" | "completed";

export type ActiveSetRow = {
  setNumber: number;
  targetReps: number;
  weightKg: string;
  status: SetRowStatus;
  loggedSetId: number | null;
};

export type ActiveExerciseCard = {
  exerciseId: number;
  index: number;
  name: string;
  targetSets: number;
  targetReps: number;
  restSec: number;
  sets: ActiveSetRow[];
  isComplete: boolean;
};

export type ActiveSessionView = {
  sessionId: number;
  workoutId: number;
  workoutName: string;
  startedAt: Date;
  defaultRestSec: number;
  exercises: ActiveExerciseCard[];
};

export type ActiveSessionStatus = "loading" | "ready" | "completing" | "completed" | "error";

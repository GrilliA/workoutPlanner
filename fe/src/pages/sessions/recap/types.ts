export type RecapStatus = "completed" | "abandoned";

export type RecapSetRow = {
  setNumber: number;
  weightKg: number | null;
  reps: number;
};

export type RecapExerciseCard = {
  exerciseId: number;
  index: number;
  name: string;
  sets: RecapSetRow[];
};

export type SessionRecapView = {
  sessionId: number;
  workoutName: string;
  status: RecapStatus;
  startedAt: Date;
  completedAt: Date | null;
  durationMin: number;
  volumeKg: number;
  exercises: RecapExerciseCard[];
};

export type SessionRecapStatus = "loading" | "ready" | "error";

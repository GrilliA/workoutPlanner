/** Scheda "In uso" in cima alla tab Schede. */
export type ActiveProgramModel = {
  workoutId: number;
  name: string;
  /** "dal coach" / "tua". */
  sourceLabel: string;
  isFromCoach: boolean;
  /** "Valida fino al 15 ottobre", solo per la scheda del coach. */
  validityLabel: string | null;
  days: Array<{ id: number; name: string; weekdaysLabel: string }>;
};

export type MyWorkoutStatus = "active" | "paused" | "inactive";

/** Riga di "Le mie schede". */
export type MyWorkoutRow = {
  workoutId: number;
  name: string;
  meta: string;
  status: MyWorkoutStatus;
};

export type WorkoutsModel = {
  activeProgram: ActiveProgramModel | null;
  myWorkouts: MyWorkoutRow[];
};

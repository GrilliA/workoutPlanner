export { API_BASE } from "./config";
export { ApiError, apiRequest, refreshAccessToken } from "./client";
export * from "./schemas";
export {
  getWorkouts,
  getWorkout,
  createWorkout,
  updateWorkout,
  saveWorkoutProgram,
} from "./workouts";
export {
  getExercisesByWorkout,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
} from "./exercises";
export { searchCatalogExercises, getCatalogExercise, getCatalogFacets } from "./catalog";
export {
  hydrateExercisesFromCatalog,
  deriveImageUrlEnd,
  catalogImageUrlsFromId,
} from "./hydrateCatalog";
export { login, register, getMe, updateProfile, changePassword, logout } from "./auth";
export {
  startSession,
  getSessionsByWorkout,
  getSessions,
  getSession,
  getSessionHistory,
  patchSession,
  completeSession,
  abandonSession,
  logSet,
  patchLoggedSet,
  deleteLoggedSet,
} from "./sessions";
export { getStats, getAthleteAnalytics } from "./stats";
export { getActiveAssignment, revokeActiveAssignment } from "./assignments";
export type { ActiveAssignment } from "./schemas/assignment";
export {
  getAthleteCoach,
  linkAthleteCoach,
  unlinkAthleteCoach,
} from "./athlete";
export type { AthleteCoach } from "./athlete";
export {
  getWorkoutDays,
  getWorkoutDay,
  createWorkoutDay,
  updateWorkoutDay,
  deleteWorkoutDay,
  setWorkoutDayWeekdays,
  getWorkoutDayExercises,
  createWorkoutDayExercise,
  getWorkoutScheduleToday,
  setScheduleOverride,
  deleteScheduleOverride,
} from "./workoutdays";

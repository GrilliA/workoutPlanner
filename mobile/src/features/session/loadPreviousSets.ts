import {
  getSession,
  getSessionsByWorkout,
  type LoggedSet,
} from "../../api";
import { groupSetsByExercise } from "./groupSetsByExercise";

/** Serie della sessione completata più recente dello stesso workout. */
export async function loadPreviousSetsByExercise(
  workoutId: number,
  currentSessionId: number,
): Promise<Map<number, LoggedSet[]>> {
  try {
    const sessions = await getSessionsByWorkout(workoutId);
    const previous = [...sessions]
      .filter(
        (session) =>
          session.status === "completed" && session.id !== currentSessionId,
      )
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() ?? a.startedAt.getTime();
        const bTime = b.completedAt?.getTime() ?? b.startedAt.getTime();
        return bTime - aTime;
      })[0];

    if (!previous) {
      return new Map();
    }

    const full = await getSession(previous.id);
    return groupSetsByExercise(full.sets);
  } catch {
    return new Map();
  }
}

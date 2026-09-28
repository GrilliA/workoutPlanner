import { useState } from "react";
import {
  emptyWorkoutDraft,
  WorkoutBuilder,
} from "../../src/features/workoutprogram";

export default function NewWorkoutScreen() {
  const [initialDraft] = useState(emptyWorkoutDraft);
  return <WorkoutBuilder initialDraft={initialDraft} />;
}

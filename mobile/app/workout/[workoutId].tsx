import { Redirect, useLocalSearchParams } from "expo-router";

/** Athletes cannot edit programs — view/log only from Home. */
export default function EditWorkoutScreen() {
  useLocalSearchParams<{ workoutId: string }>();
  return <Redirect href="/(app)/workouts" />;
}

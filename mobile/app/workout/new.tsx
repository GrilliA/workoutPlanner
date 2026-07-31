import { Redirect } from "expo-router";

/** Athletes cannot create programs — coach assigns them from the web panel. */
export default function NewWorkoutScreen() {
  return <Redirect href="/(app)/workouts" />;
}

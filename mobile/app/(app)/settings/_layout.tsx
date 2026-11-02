import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

/** Account e le sue sotto-schermate (coach, profilo, password) dentro la tab. */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    />
  );
}

import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/auth";

export default function AuthLayout() {
  const { status } = useAuth();

  if (status === "authenticated") {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

import { Stack } from "expo-router";
import { Pressable, Text } from "react-native";
import { API_BASE } from "../src/api/config";
import { AuthProvider, useAuth } from "../src/auth";
import { LoadingBlock, Screen } from "../src/components";
import { colors } from "../src/theme";

export { ErrorBoundary } from "expo-router";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, retryBootstrap } = useAuth();

  if (status === "loading") {
    return <LoadingBlock label="Sessione…" />;
  }

  if (status === "error") {
    return (
      <Screen>
        <Text style={{ color: colors.textHeading, marginBottom: 8 }}>
          Errore di rete verso l'API.
        </Text>
        <Text
          selectable
          style={{ color: colors.muted, marginBottom: 12, fontSize: 12 }}
        >
          {API_BASE}
        </Text>
        <Pressable onPress={retryBootstrap}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>Riprova</Text>
        </Pressable>
      </Screen>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="session/[sessionId]" />
          <Stack.Screen name="workout/new" />
          <Stack.Screen name="workout/[workoutId]" />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}

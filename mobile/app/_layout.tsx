import { Stack } from "expo-router";
import { Pressable, Text } from "react-native";
import { API_BASE } from "../src/api/config";
import { AuthProvider, useAuth } from "../src/auth";
import { LoadingBlock, Screen } from "../src/components/ui";
import { colors } from "../src/theme/colors";

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
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.textHeading,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen
            name="session/[sessionId]"
            options={{ title: "Sessione", headerBackTitle: "Indietro" }}
          />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}

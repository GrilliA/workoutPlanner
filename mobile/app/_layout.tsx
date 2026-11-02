import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable } from "react-native";
import { API_BASE } from "../src/api/config";
import { AuthProvider, CoachBlockScreen, useAuth } from "../src/auth";
import { AppText, LoadingBlock, Screen } from "../src/components";
import { useOfflineSessionSync } from "../src/features/session/useOfflineSessionSync";
import { useRestNotificationRouting } from "../src/features/session/useRestNotificationRouting";
import { colors } from "../src/theme";

export { ErrorBoundary } from "expo-router";

// Lo splash resta finché Plus Jakarta Sans non è caricato: niente testo col font di sistema.
void SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, user, retryBootstrap } = useAuth();
  const isSignedInAthlete = status === "authenticated" && user?.role !== "coach";
  useRestNotificationRouting(isSignedInAthlete);
  useOfflineSessionSync(isSignedInAthlete && user ? user.id : null);

  if (status === "loading") {
    return <LoadingBlock label="Sessione…" />;
  }

  if (status === "authenticated" && user?.role === "coach") {
    return <CoachBlockScreen />;
  }

  if (status === "error") {
    return (
      <Screen>
        <AppText tone="heading" style={{ marginBottom: 8 }}>
          Errore di rete verso l'API.
        </AppText>
        <AppText selectable variant="meta" style={{ marginBottom: 12 }}>
          {API_BASE}
        </AppText>
        <Pressable onPress={retryBootstrap}>
          <AppText tone="accent" style={{ fontWeight: "700" }}>
            Riprova
          </AppText>
        </Pressable>
      </Screen>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // Con un errore di caricamento si va avanti col font di sistema, non si resta sullo splash.
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsSettled) {
      void SplashScreen.hideAsync();
    }
  }, [fontsSettled]);

  if (!fontsSettled) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade",
            animationDuration: 200,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" options={{ animation: "fade" }} />
          <Stack.Screen
            name="session/[sessionId]"
            options={{ animation: "slide_from_right", animationDuration: 220 }}
          />
          <Stack.Screen
            name="session/complete"
            options={{ animation: "fade", animationDuration: 280 }}
          />
          <Stack.Screen
            name="workout/new"
            options={{ animation: "slide_from_right", animationDuration: 220 }}
          />
          <Stack.Screen
            name="workout/[workoutId]"
            options={{ animation: "slide_from_right", animationDuration: 220 }}
          />
        </Stack>
      </AuthGate>
    </AuthProvider>
  );
}

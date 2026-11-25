import { Redirect, Tabs } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import type { ColorValue } from "react-native";
import { getAthleteHome } from "../../src/api";
import { GlassTabBar, Icon, type IconName } from "../../src/components";
import { CoachBlockScreen, useAuth } from "../../src/auth";
import { AppModeProvider, isTabHiddenInMode, useAppMode } from "../../src/features/nutrition";
import { colors } from "../../src/theme";

function TabBarIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Icon name={name} color={color} size={23} />;
}

type AppTabsProps = {
  /** Badge "scheda nuova" sulla tab Schede. */
  hasUnseenAssignment: boolean;
  onOpenWorkouts: () => void;
};

function AppTabs({ hasUnseenAssignment, onOpenWorkouts }: AppTabsProps) {
  const { mode, refreshNutrition } = useAppMode();
  const isNutrition = mode === "nutrition";
  // `href: null` toglie la tab dell'altra modalità; GlassTabBar non la disegna.
  const hrefFor = (routeName: string) => (isTabHiddenInMode(routeName, mode) ? null : undefined);
  // A ogni cambio di tab si rilegge `nutrition`: se il coach ha disattivato il piano si torna in Allenamento.
  const screenListeners = useMemo(() => ({ focus: refreshNutrition }), [refreshNutrition]);

  return (
    <Tabs
      tabBar={(props) => (
        <GlassTabBar
          {...props}
          hasUnseenAssignment={hasUnseenAssignment}
          activePillTone={isNutrition ? "data" : "ink"}
        />
      )}
      screenOptions={{
        headerShown: false,
        animation: "none",
        sceneStyle: { backgroundColor: colors.bg },
      }}
      screenListeners={screenListeners}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isNutrition ? "Oggi" : "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        listeners={{ tabPress: onOpenWorkouts }}
        options={{
          href: hrefFor("workouts"),
          title: "Schede",
          tabBarIcon: ({ color }) => <TabBarIcon name="workout" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          href: hrefFor("meals"),
          title: "Piano pasti",
          tabBarIcon: ({ color }) => <TabBarIcon name="meals" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Progressi",
          tabBarIcon: ({ color }) => <TabBarIcon name="stats" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function AppLayout() {
  const { status, user } = useAuth();
  const [hasUnseenAssignment, setHasUnseenAssignment] = useState(false);
  const isAthlete = status === "authenticated" && user?.role !== "coach";

  // La tab Schede segna la scheda come vista sul server (markAssignmentSeen).
  useEffect(() => {
    if (!isAthlete) {
      return;
    }
    let cancelled = false;
    void getAthleteHome()
      .then((home) => {
        if (!cancelled) {
          setHasUnseenAssignment(home.hasUnseenAssignment);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAthlete, user?.id]);

  if (status === "anonymous" || status === "error") {
    return <Redirect href="/(auth)/login" />;
  }

  if (status === "loading") {
    return null;
  }

  if (user?.role === "coach") {
    return <CoachBlockScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <AppModeProvider key={user.id} userId={user.id}>
      <AppTabs
        hasUnseenAssignment={hasUnseenAssignment}
        onOpenWorkouts={() => setHasUnseenAssignment(false)}
      />
    </AppModeProvider>
  );
}

import { Redirect, Tabs } from "expo-router";
import { Icon, type IconName } from "../../src/components";
import { CoachBlockScreen, useAuth } from "../../src/auth";
import { colors } from "../../src/theme";

function TabBarIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <Icon name={name} color={focused ? colors.accent : colors.muted} size={22} />
  );
}

export default function AppLayout() {
  const { status, user } = useAuth();

  if (status === "anonymous" || status === "error") {
    return <Redirect href="/(auth)/login" />;
  }

  if (status === "loading") {
    return null;
  }

  if (user?.role === "coach") {
    return <CoachBlockScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Workout",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="workout" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Progressi",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="stats" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

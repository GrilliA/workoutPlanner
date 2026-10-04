import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { GlassTabBar, Icon, type IconName } from "../../src/components";
import { CoachBlockScreen, useAuth } from "../../src/auth";
import { colors } from "../../src/theme";

function TabBarIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Icon name={name} color={color} size={23} />;
}

type AppTabsProps = {
  /** Badge "scheda nuova" sulla tab Schede — dati reali collegati in M3d. */
  hasUnseenAssignment: boolean;
};

function AppTabs({ hasUnseenAssignment }: AppTabsProps) {
  return (
    <Tabs
      tabBar={(props) => (
        <GlassTabBar {...props} hasUnseenAssignment={hasUnseenAssignment} />
      )}
      screenOptions={{
        headerShown: false,
        animation: "fade",
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Schede",
          tabBarIcon: ({ color }) => <TabBarIcon name="workout" color={color} />,
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

  if (status === "anonymous" || status === "error") {
    return <Redirect href="/(auth)/login" />;
  }

  if (status === "loading") {
    return null;
  }

  if (user?.role === "coach") {
    return <CoachBlockScreen />;
  }

  return <AppTabs hasUnseenAssignment={false} />;
}

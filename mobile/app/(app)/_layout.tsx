import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { CoachBlockScreen, useAuth } from "../../src/auth";
import { colors } from "../../src/theme";

type AppTabsProps = {
  /** Badge "scheda nuova" sulla tab Schede — dati reali collegati in M3d. */
  hasUnseenAssignment: boolean;
};

function AppTabs({ hasUnseenAssignment }: AppTabsProps) {
  return (
    <NativeTabs
      iconColor={{ default: colors.muted, selected: colors.accent }}
      labelStyle={{
        default: { color: colors.muted, fontSize: 11, fontWeight: "600" },
        selected: { color: colors.accent, fontSize: 11, fontWeight: "600" },
      }}
      tintColor={colors.accent}
      badgeBackgroundColor="#ff3b30"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="workouts">
        <NativeTabs.Trigger.Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          md="description"
        />
        <NativeTabs.Trigger.Label>Schede</NativeTabs.Trigger.Label>
        {hasUnseenAssignment ? (
          <NativeTabs.Trigger.Badge>1</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          md="bar_chart"
        />
        <NativeTabs.Trigger.Label>Progressi</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
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

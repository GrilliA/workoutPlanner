import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { getAthleteCoach } from "../../../api";
import { useAuth } from "../../../auth";
import { AppText, Meta, Screen, useTabBarInset } from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import { formatInitials } from "../../../utils/initials";
import { formatCoachName } from "../mappers/settingsLabels";
import { SettingsRow } from "../settingsrow";

/** Account a righe: ogni riga apre la sua schermata. */
export function SettingsScreen() {
  const { user, logout } = useAuth();
  const tabBarInset = useTabBarInset();
  const [coachName, setCoachName] = useState<string | null>(null);

  // Al ritorno da "Coach" il nome va riletto.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getAthleteCoach()
        .then((response) => {
          if (!cancelled) {
            setCoachName(response.coach ? formatCoachName(response.coach) : null);
          }
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <AppText tone="accent" style={styles.avatarLabel}>
              {formatInitials(user?.name)}
            </AppText>
          </View>
          <AppText tone="heading" style={styles.name}>
            {user?.name?.trim() || "Atleta"}
          </AppText>
          <Meta>{user?.email}</Meta>
        </View>

        <View style={styles.group}>
          <SettingsRow
            icon="person"
            tone="data"
            title="Coach"
            value={coachName ?? "Non collegato"}
            onPress={() => router.push("/(app)/settings/coach")}
          />
        </View>

        <View style={styles.group}>
          <SettingsRow
            icon="pencil"
            tone="accent"
            title="Profilo"
            onPress={() => router.push("/(app)/settings/profile")}
          />
          <View style={styles.separator} />
          <SettingsRow
            icon="key"
            tone="warning"
            title="Password"
            onPress={() => router.push("/(app)/settings/password")}
          />
        </View>

        <View style={styles.group}>
          <SettingsRow
            icon="logout"
            tone="danger"
            title="Esci"
            isDanger
            onPress={() => {
              void onLogout();
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  head: {
    alignItems: "center",
    gap: 2,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    backgroundColor: colors.accentBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarLabel: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  name: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  separator: {
    height: 1,
    marginLeft: spacing.md + 36 + spacing.sm,
    backgroundColor: colors.border,
  },
});

import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BrandLogo, PrimaryButton, Screen } from "../components";
import { colors, spacing } from "../theme";
import { useAuth } from "./useAuth";

/** Blocks coach accounts — mobile is athlete-only. */
export function CoachBlockScreen() {
  const { logout } = useAuth();

  const onLogout = () => {
    void logout().then(() => {
      router.replace("/(auth)/login");
    });
  };

  return (
    <Screen>
      <View style={styles.content}>
        <BrandLogo size="lg" />
        <Text style={styles.eyebrow}>AREA COACH</Text>
        <Text style={styles.title}>Il pannello web è riservato ai coach</Text>
        <Text style={styles.support}>
          Accedi dal browser per gestire clienti, schede e assegnazioni. L'app
          mobile è dedicata agli atleti.
        </Text>
        <PrimaryButton label="Esci" onPress={onLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: spacing.md,
  },
  title: {
    color: colors.textHeading,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.xs,
  },
  support: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    maxWidth: 320,
  },
});

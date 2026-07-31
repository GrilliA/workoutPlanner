import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Body, BrandLogo, Screen } from "../../src/components";
import { colors, spacing } from "../../src/theme";

export default function RegisterScreen() {
  return (
    <Screen>
      <View style={styles.box}>
        <BrandLogo size="lg" />
        <Text style={styles.eyebrow}>ACCOUNT ATLETA</Text>
        <Body>
          L&apos;account viene creato dal tuo coach dal pannello web. Chiedigli
          email e password temporanea, poi accedi dall&apos;app.
        </Body>
        <Link href="/(auth)/login" asChild>
          <Text style={styles.link}>Vai al login</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    alignItems: "center",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    marginTop: spacing.md,
  },
});

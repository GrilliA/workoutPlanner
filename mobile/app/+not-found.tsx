import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText, fontForWeight } from "../src/components";
import { colors, spacing } from "../src/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Non trovata" }} />
      <View style={styles.container}>
        <AppText style={styles.title}>Schermata non trovata</AppText>
        <Link href="/" style={[styles.link, fontForWeight(styles.link)]}>
          Torna alla home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.textHeading,
    fontSize: 20,
    fontWeight: "700",
  },
  link: {
    marginTop: spacing.md,
    color: colors.accentText,
    fontWeight: "600",
  },
});

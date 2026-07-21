import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../src/theme/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Non trovata" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Schermata non trovata</Text>
        <Link href="/" style={styles.link}>
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
    color: colors.accent,
    fontWeight: "600",
  },
});

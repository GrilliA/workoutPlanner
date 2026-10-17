import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { BackHeader, Screen, Title, useTabBarInset } from "../../components";
import { spacing } from "../../theme";

type SettingsSubscreenProps = {
  title: string;
  children: React.ReactNode;
};

/** Cornice delle sotto-schermate di Account: freccia indietro, titolo, contenuto. */
export function SettingsSubscreen({ title, children }: SettingsSubscreenProps) {
  const tabBarInset = useTabBarInset();
  return (
    <Screen padded={false}>
      <BackHeader onPress={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
          keyboardShouldPersistTaps="handled"
        >
          <Title>{title}</Title>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
});

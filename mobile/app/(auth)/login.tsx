import { Link, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ApiError } from "../../src/api/client";
import { API_BASE } from "../../src/api/config";
import { useAuth } from "../../src/auth";
import {
  Body,
  ErrorBanner,
  Field,
  PrimaryButton,
  Screen,
  Title,
} from "../../src/components";
import { colors, spacing } from "../../src/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);

    try {
      await login({ email, password });
      router.replace("/(app)");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        const detail =
          err instanceof Error ? err.message : "errore sconosciuto";
        setError(`Login non riuscito (${detail}). API: ${API_BASE}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <Title>TRACCIA</Title>
        <Body>Accedi per continuare</Body>
        <View style={styles.form}>
          {error ? <ErrorBanner message={error} /> : null}
          <Field
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
          />
          <Field
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
          />
          <PrimaryButton
            label={busy ? "Accesso…" : "Accedi"}
            onPress={() => {
              void onSubmit();
            }}
            disabled={busy || !email || !password}
          />
          <Link href="/(auth)/register" asChild>
            <Text style={styles.link}>Crea un account</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "center" },
  form: { marginTop: spacing.lg },
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "600",
  },
});

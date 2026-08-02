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
import { useAuth } from "../../src/auth";
import {
  Body,
  BrandLogo,
  ErrorBanner,
  Field,
  PrimaryButton,
  Screen,
} from "../../src/components";
import { colors, spacing } from "../../src/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await register({
        email,
        password,
        name: name.trim() || undefined,
      });
      router.replace("/(app)");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Registrazione non riuscita",
      );
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
        <View style={styles.brand}>
          <BrandLogo size="lg" />
          <Text style={styles.eyebrow}>CREA ACCOUNT</Text>
          <Body>
            Registrati per creare le tue schede. Potrai collegare un coach dopo
            con un codice invito.
          </Body>
        </View>
        <View style={styles.form}>
          {error ? <ErrorBanner message={error} /> : null}
          <Field
            placeholder="Nome (opzionale)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Field
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
          />
          <Field
            placeholder="Password (min. 8)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
          />
          <PrimaryButton
            label={busy ? "Creazione…" : "Registrati"}
            onPress={() => {
              void onSubmit();
            }}
            disabled={busy || !email || password.length < 8}
          />
          <Link href="/(auth)/login" asChild>
            <Text style={styles.link}>Hai già un account? Accedi</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "center" },
  brand: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  form: { marginTop: spacing.md },
  link: {
    color: colors.accent,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "600",
  },
});

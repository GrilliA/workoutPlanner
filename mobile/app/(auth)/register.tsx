import { Link, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { ApiError } from "../../src/api/client";
import { useAuth } from "../../src/auth";
import {
  AppText,
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
          <AppText style={styles.title}>Crea il tuo account</AppText>
          <Body style={styles.intro}>
            Crea le tue schede da solo. Un coach lo puoi collegare dopo, con il suo
            codice invito.
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
            <AppText style={styles.link}>Hai già un account? Accedi</AppText>
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
  title: {
    color: colors.textHeading,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: spacing.sm,
  },
  intro: {
    textAlign: "center",
    maxWidth: 300,
  },
  form: { marginTop: spacing.md },
  link: {
    color: colors.accentText,
    textAlign: "center",
    paddingVertical: spacing.md,
    fontWeight: "700",
  },
});

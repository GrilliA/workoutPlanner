import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "../../src/api/client";
import { changePassword, updateProfile } from "../../src/api/auth";
import { useAuth } from "../../src/auth";
import {
  AppText,
  Body,
  ErrorBanner,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
  Title,
} from "../../src/components";
import { spacing } from "../../src/theme";

export default function SettingsScreen() {
  const { user, logout, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { user: updated } = await updateProfile({
        name: name.trim() || null,
      });
      setUser(updated);
      setMessage("Profilo aggiornato");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore salvataggio");
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password aggiornata");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore password");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Title>IMPOSTAZIONI</Title>
          <Body>{user?.email}</Body>
          {error ? <ErrorBanner message={error} /> : null}
          {message ? (
            <AppText tone="accent" style={styles.ok}>
              {message}
            </AppText>
          ) : null}

          <View style={styles.block}>
            <SectionLabel>PROFILO</SectionLabel>
            <Field
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Nome"
            />
            <PrimaryButton
              label="Salva profilo"
              onPress={() => void saveProfile()}
              disabled={busy}
            />
          </View>

          <View style={styles.block}>
            <SectionLabel>PASSWORD</SectionLabel>
            <Field
              placeholder="Password attuale"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Field
              placeholder="Nuova password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <PrimaryButton
              label="Aggiorna password"
              onPress={() => void savePassword()}
              disabled={busy || !currentPassword || newPassword.length < 8}
            />
          </View>

          <SecondaryButton
            label="Esci dall'account"
            onPress={() => void onLogout()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  block: { marginTop: spacing.lg },
  ok: { marginVertical: spacing.sm },
});

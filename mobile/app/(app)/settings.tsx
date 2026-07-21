import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../src/api/client";
import { changePassword, updateProfile } from "../../src/api/auth";
import { useAuth } from "../../src/auth";
import {
  Body,
  ErrorBanner,
  Field,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Title,
} from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

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
    <Screen>
      <Title>Account</Title>
      <Body>{user?.email}</Body>
      {error ? <ErrorBanner message={error} /> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}

      <View style={styles.block}>
        <Text style={styles.label}>Nome</Text>
        <Field value={name} onChangeText={setName} autoCapitalize="words" />
        <PrimaryButton
          label="Salva profilo"
          onPress={() => void saveProfile()}
          disabled={busy}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Cambia password</Text>
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

      <SecondaryButton label="Esci" onPress={() => void onLogout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg },
  label: {
    color: colors.muted,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  ok: { color: colors.accent, marginVertical: spacing.sm },
});

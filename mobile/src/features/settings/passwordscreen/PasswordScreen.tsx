import { useState } from "react";
import { changePassword } from "../../../api";
import { ApiError } from "../../../api/client";
import { AppText, ErrorBanner, Field, Meta, PrimaryButton } from "../../../components";
import { SettingsSubscreen } from "../subscreen";

const MIN_PASSWORD_LENGTH = 8;

/** Account › Password: attuale + nuova (almeno 8 caratteri). */
export function PasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isReady = currentPassword !== "" && newPassword.length >= MIN_PASSWORD_LENGTH;

  const onSave = async () => {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password aggiornata");
    } catch (err) {
      setError(ApiError.messageFrom(err, "Aggiornamento non riuscito"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SettingsSubscreen title="Password">
      {error ? <ErrorBanner message={error} /> : null}
      {message ? (
        <AppText tone="accent" variant="label">
          {message}
        </AppText>
      ) : null}
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
      <Meta>Almeno {MIN_PASSWORD_LENGTH} caratteri.</Meta>
      <PrimaryButton
        label="Aggiorna password"
        onPress={() => {
          void onSave();
        }}
        disabled={isBusy || !isReady}
      />
    </SettingsSubscreen>
  );
}

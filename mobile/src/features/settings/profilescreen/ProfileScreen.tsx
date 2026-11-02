import { useState } from "react";
import { updateProfile } from "../../../api";
import { ApiError } from "../../../api/client";
import { useAuth } from "../../../auth";
import { AppText, ErrorBanner, Field, Meta, PrimaryButton } from "../../../components";
import { SettingsSubscreen } from "../subscreen";

/** Account › Profilo: il nome mostrato al coach e nella Home. */
export function ProfileScreen() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSave = async () => {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { user: updated } = await updateProfile({ name: name.trim() || null });
      setUser(updated);
      setMessage("Profilo aggiornato");
    } catch (err) {
      setError(ApiError.messageFrom(err, "Salvataggio non riuscito"));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SettingsSubscreen title="Profilo">
      {error ? <ErrorBanner message={error} /> : null}
      {message ? (
        <AppText tone="accent" variant="label">
          {message}
        </AppText>
      ) : null}
      <Meta>Nome</Meta>
      <Field value={name} onChangeText={setName} autoCapitalize="words" placeholder="Nome" />
      <Meta>Email: {user?.email}</Meta>
      <PrimaryButton
        label="Salva"
        onPress={() => {
          void onSave();
        }}
        disabled={isBusy}
      />
    </SettingsSubscreen>
  );
}

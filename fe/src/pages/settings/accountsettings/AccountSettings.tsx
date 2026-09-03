import { useState } from "react";
import { useLocation } from "wouter";
import { ApiError, changePassword, updateProfile } from "@api";
import { useAuth } from "@auth";
import { Input } from "@components/input";
import { Button } from "@components/button";
import { toast } from "@components/toast";
import { getAvatarInitial, getDisplayName } from "@utils/displayName";
import "./style.css";

export function AccountSettings() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.name ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);

    try {
      const { user: updated } = await updateProfile({
        name: name.trim() || null,
      });
      setUser(updated);
      setName(updated.name ?? "");
      toast.success("Profilo aggiornato");
    } catch (err) {
      toast.error(ApiError.messageFrom(err, "Impossibile aggiornare il profilo"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Le password non coincidono");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("La nuova password deve avere almeno 8 caratteri");
      return;
    }

    setIsSavingPassword(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password aggiornata");
    } catch (err) {
      toast.error(
        ApiError.messageFrom(err, "Impossibile aggiornare la password"),
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="account-settings page-container">
      <header className="header">
        <p className="eyebrow">IMPOSTAZIONI</p>
        <h1 className="title">Account</h1>
      </header>

      <section className="profile-card" aria-labelledby="profile-title">
        <div className="avatar" aria-hidden="true">
          {getAvatarInitial(displayName)}
        </div>

        <div className="profile-copy">
          <h2 id="profile-title" className="profile-name">
            {displayName}
          </h2>
          <p className="profile-email">{user.email}</p>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="profile-form-title">
        <h2 id="profile-form-title" className="section-title">
          PROFILO
        </h2>

        <div className="panel">
          <Input
            id="settings-name"
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Il tuo nome"
            autoComplete="name"
          />

          <Input
            id="settings-email"
            label="Email"
            value={user.email}
            disabled
            readOnly
          />

          <Button
            variant="primary"
            loading={isSavingProfile}
            onClick={() => void handleSaveProfile()}
          >
            Salva profilo
          </Button>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="password-form-title">
        <h2 id="password-form-title" className="section-title">
          PASSWORD
        </h2>

        <div className="panel">
          <Input
            id="settings-current-password"
            label="Password attuale"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
          />

          <Input
            id="settings-new-password"
            label="Nuova password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
          />

          <Input
            id="settings-confirm-password"
            label="Conferma nuova password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
          />

          {passwordError ? (
            <p className="form-error" role="alert">
              {passwordError}
            </p>
          ) : null}

          <Button
            variant="secondary"
            loading={isSavingPassword}
            onClick={() => void handleChangePassword()}
          >
            Aggiorna password
          </Button>
        </div>
      </section>

      <section className="settings-section">
        <Button variant="ghost" onClick={() => void handleLogout()}>
          Esci dall&apos;account
        </Button>
      </section>
    </div>
  );
}

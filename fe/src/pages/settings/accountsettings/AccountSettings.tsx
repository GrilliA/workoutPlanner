import { useState } from "react";
import { useLocation } from "wouter";
import { ApiError, changePassword, updateProfile } from "@api";
import { useAuth } from "@auth";
import { Input } from "@components/input";
import { Button } from "@components/button";
import { getAvatarInitial, getDisplayName } from "@utils/displayName";
import "./style.css";

export function AccountSettings() {
  const { user, setUser, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.name ?? "");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!user) {
    return null;
  }

  const displayName = getDisplayName(user);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const { user: updated } = await updateProfile({
        name: name.trim() || null,
      });
      setUser(updated);
      setName(updated.name ?? "");
      setProfileMessage("Profilo aggiornato");
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Impossibile aggiornare il profilo",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
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
      setPasswordMessage("Password aggiornata");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Impossibile aggiornare la password",
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
          <Input.Root>
            <Input.Label>Nome</Input.Label>
            <Input.Field
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Il tuo nome"
              autoComplete="name"
            />
          </Input.Root>

          <Input.Root>
            <Input.Label>Email</Input.Label>
            <Input.Field value={user.email} disabled readOnly />
          </Input.Root>

          {profileError ? (
            <p className="form-error" role="alert">
              {profileError}
            </p>
          ) : null}

          {profileMessage ? (
            <p className="form-success" role="status">
              {profileMessage}
            </p>
          ) : null}

          <Button.Root
            variant="primary"
            loading={isSavingProfile}
            disabled={isSavingProfile}
            onClick={() => void handleSaveProfile()}
          >
            <Button.Label>Salva profilo</Button.Label>
          </Button.Root>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="password-form-title">
        <h2 id="password-form-title" className="section-title">
          PASSWORD
        </h2>

        <div className="panel">
          <Input.Root>
            <Input.Label>Password attuale</Input.Label>
            <Input.Field
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </Input.Root>

          <Input.Root>
            <Input.Label>Nuova password</Input.Label>
            <Input.Field
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </Input.Root>

          <Input.Root>
            <Input.Label>Conferma nuova password</Input.Label>
            <Input.Field
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </Input.Root>

          {passwordError ? (
            <p className="form-error" role="alert">
              {passwordError}
            </p>
          ) : null}

          {passwordMessage ? (
            <p className="form-success" role="status">
              {passwordMessage}
            </p>
          ) : null}

          <Button.Root
            variant="secondary"
            loading={isSavingPassword}
            disabled={isSavingPassword}
            onClick={() => void handleChangePassword()}
          >
            <Button.Label>Aggiorna password</Button.Label>
          </Button.Root>
        </div>
      </section>

      <section className="settings-section">
        <Button.Root variant="ghost" onClick={() => void handleLogout()}>
          <Button.Label>Esci dall&apos;account</Button.Label>
        </Button.Root>
      </section>
    </div>
  );
}

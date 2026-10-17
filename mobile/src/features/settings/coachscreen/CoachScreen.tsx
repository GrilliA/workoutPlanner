import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  clearApiCache,
  getAthleteCoach,
  linkAthleteCoach,
  unlinkAthleteCoach,
  type AthleteCoach,
} from "../../../api";
import { ApiError } from "../../../api/client";
import {
  AppText,
  Body,
  DangerButton,
  ErrorBanner,
  Field,
  LoadingBlock,
  Meta,
  PrimaryButton,
} from "../../../components";
import { colors, radii, shadows, spacing } from "../../../theme";
import { SettingsSubscreen } from "../subscreen";

/** Account › Coach: collega con il codice invito o rimuovi il coach. */
export function CoachScreen() {
  const [coach, setCoach] = useState<AthleteCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAthleteCoach()
      .then((response) => {
        if (!cancelled) {
          setCoach(response.coach);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(ApiError.messageFrom(err, "Errore di caricamento"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onLink = async () => {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await linkAthleteCoach(inviteCode);
      clearApiCache();
      setCoach(response.coach);
      setInviteCode("");
      setMessage("Coach collegato");
    } catch (err) {
      setError(ApiError.messageFrom(err, "Codice non valido"));
    } finally {
      setIsBusy(false);
    }
  };

  const onUnlink = async () => {
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      await unlinkAthleteCoach();
      clearApiCache();
      setCoach(null);
      setIsConfirmingUnlink(false);
      setMessage("Coach rimosso");
    } catch (err) {
      setError(ApiError.messageFrom(err, "Rimozione non riuscita"));
    } finally {
      setIsBusy(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <SettingsSubscreen title="Coach">
      {error ? <ErrorBanner message={error} /> : null}
      {message ? (
        <AppText tone="accent" variant="label">
          {message}
        </AppText>
      ) : null}

      {coach ? (
        <View style={styles.card}>
          <Meta>Il tuo coach</Meta>
          <AppText tone="heading" style={styles.coachName}>
            {coach.name?.trim() || coach.email}
          </AppText>
          {coach.name ? <Meta>{coach.email}</Meta> : null}
        </View>
      ) : (
        <>
          <Body>Inserisci il codice invito del tuo coach per ricevere le sue schede.</Body>
          <Field
            placeholder="Codice invito"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <PrimaryButton
            label="Collega coach"
            onPress={() => {
              void onLink();
            }}
            disabled={isBusy || inviteCode.trim().length < 4}
          />
        </>
      )}

      {coach && !isConfirmingUnlink ? (
        <DangerButton label="Rimuovi coach" onPress={() => setIsConfirmingUnlink(true)} />
      ) : null}

      {coach && isConfirmingUnlink ? (
        <View style={styles.confirm}>
          <Body>
            Le schede assegnate dal coach verranno revocate. Potrai collegarne un altro dopo.
          </Body>
          <DangerButton
            label="Sì, rimuovi coach"
            onPress={() => {
              void onUnlink();
            }}
            disabled={isBusy}
          />
          <PrimaryButton label="Annulla" onPress={() => setIsConfirmingUnlink(false)} />
        </View>
      ) : null}
    </SettingsSubscreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 2,
    ...shadows.card,
  },
  coachName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  confirm: {
    gap: spacing.xs,
  },
});

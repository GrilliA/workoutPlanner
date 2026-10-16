import { router } from "expo-router";
import { useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import {
  Body,
  BottomSheet,
  Card,
  Meta,
  PrimaryButton,
  SecondaryButton,
} from "../../components";
import { spacing } from "../../theme";
import {
  dismissOfflineConflict,
  getOfflineSession,
  subscribeOfflineSession,
} from "./offlineSessionStore";

/**
 * Home row for the session kept on the phone: resume it while it is open,
 * say it is waiting while its close is not on the server, and explain a
 * conflict once.
 */
export function OfflineSessionBanner() {
  const offlineSession = useSyncExternalStore(
    subscribeOfflineSession,
    getOfflineSession,
  );

  if (!offlineSession) {
    return null;
  }

  const { log, syncStatus } = offlineSession;

  if (syncStatus === "conflict") {
    const unsavedSetCount = log.sets.length;
    const setsLabel = unsavedSetCount === 1 ? "1 serie" : `${unsavedSetCount} serie`;

    return (
      <BottomSheet
        visible
        onClose={dismissOfflineConflict}
        title="Allenamento non salvato"
      >
        <View style={styles.sheetBody}>
          <Body>
            Il server non ha accettato l'allenamento: {setsLabel} non sono state
            salvate.
          </Body>
          <PrimaryButton label="Ho capito" onPress={dismissOfflineConflict} />
        </View>
      </BottomSheet>
    );
  }

  if (log.pendingClose) {
    return (
      <Card style={styles.card}>
        <Meta>1 allenamento in attesa di sincronizzazione</Meta>
      </Card>
    );
  }

  if (log.status === "in_progress") {
    return (
      <Card style={styles.card}>
        <Body>Hai un allenamento in corso.</Body>
        <SecondaryButton
          label="Riprendi"
          onPress={() => router.push(`/session/${log.sessionId}`)}
        />
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  sheetBody: {
    gap: spacing.md,
  },
});

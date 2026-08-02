import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "../../src/api/client";
import {
  getActiveAssignment,
  getWorkouts,
  revokeActiveAssignment,
  type ActiveAssignment,
  type Workout,
} from "../../src/api";
import { useAuth } from "../../src/auth";
import {
  AppText,
  Body,
  Card,
  ErrorBanner,
  Eyebrow,
  Heading,
  LoadingBlock,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionLabel,
} from "../../src/components";
import { colors, spacing } from "../../src/theme";

const isSelfProgram = (workout: Workout, userId: number) =>
  workout.createdByUserId == null || workout.createdByUserId === userId;

export default function WorkoutsScreen() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fetchId, setFetchId] = useState(0);

  const load = useCallback(async () => {
    const [data, active] = await Promise.all([
      getWorkouts(),
      getActiveAssignment(),
    ]);
    setWorkouts(
      [...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    );
    setAssignment(active);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setError(null);
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchId, load]);

  const onCancelCoachProgram = () => {
    Alert.alert(
      "Annulla scheda coach",
      "Potrai usare le tue schede solo dopo aver annullato il programma coach attivo.",
      [
        { text: "Indietro", style: "cancel" },
        {
          text: "Annulla programma",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                await revokeActiveAssignment();
                setAssignment(null);
                await load();
              } catch (err) {
                setError(
                  err instanceof ApiError ? err.message : "Annullamento fallito",
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const selfWorkouts = user
    ? workouts.filter((item) => isSelfProgram(item, user.id))
    : [];
  const coachWorkout =
    assignment != null
      ? workouts.find((item) => item.id === assignment.workoutId)
      : null;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.list}>
        <Heading>Le tue schede</Heading>
        <Body>
          {assignment
            ? "Hai un programma coach attivo: ha priorità. Per usare le tue schede, annullalo."
            : "Crea una scheda da solo o collega un coach dalle Impostazioni."}
        </Body>

        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setLoading(true);
              setFetchId((id) => id + 1);
            }}
          />
        ) : null}

        {assignment ? (
          <Card highlight style={styles.card}>
            <Eyebrow>PROGRAMMA COACH · PRIORITÀ</Eyebrow>
            <AppText tone="heading" style={styles.cardTitle}>
              {assignment.workoutName}
            </AppText>
            <Meta>
              Valida dal {assignment.startsAt} al {assignment.expiresAt}
            </Meta>
            {coachWorkout ? (
              <Meta>
                {coachWorkout.exerciseCount} esercizi · {coachWorkout.frequency}
              </Meta>
            ) : null}
            <View style={styles.actions}>
              <SecondaryButton
                label="Annulla programma coach"
                onPress={onCancelCoachProgram}
                disabled={busy}
              />
            </View>
          </Card>
        ) : null}

        <SectionLabel>SCHEDE PERSONALI</SectionLabel>

        <PrimaryButton
          label="Crea scheda"
          onPress={() => router.push("/workout/new")}
          disabled={busy}
        />

        {selfWorkouts.length === 0 ? (
          <Body>Nessuna scheda personale ancora.</Body>
        ) : (
          selfWorkouts.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/workout/${item.id}`)}
              style={({ pressed }) => pressed && styles.cardPressed}
            >
              <Card style={styles.card}>
                {item.isActive ? (
                  <Eyebrow>ATTIVA</Eyebrow>
                ) : (
                  <Meta style={styles.inactiveLabel}>DISATTIVA</Meta>
                )}
                <AppText tone="heading" style={styles.cardTitle}>
                  {item.name}
                </AppText>
                <Meta>
                  {item.exerciseCount} esercizi · {item.frequency}
                  {assignment ? " · in pausa (coach attivo)" : ""}
                </Meta>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  cardPressed: {
    opacity: 0.75,
  },
  inactiveLabel: {
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 12,
    color: colors.muted,
  },
  actions: {
    marginTop: spacing.xs,
  },
});

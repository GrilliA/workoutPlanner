import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ApiError } from "../../src/api/client";
import {
  getActiveAssignment,
  getWorkouts,
  type ActiveAssignment,
  type Workout,
} from "../../src/api";
import {
  Body,
  Card,
  ErrorBanner,
  Heading,
  LoadingBlock,
  Meta,
  Screen,
} from "../../src/components";
import { spacing } from "../../src/theme";

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [assignment, setAssignment] = useState<ActiveAssignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchId, setFetchId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);

      try {
        const [data, active] = await Promise.all([
          getWorkouts(),
          getActiveAssignment(),
        ]);
        if (!cancelled) {
          setWorkouts(
            [...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          );
          setAssignment(active);
        }
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchId]);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.list}>
        <Heading>Le tue schede</Heading>
        <Body>
          Le schede sono gestite dal coach. Qui puoi solo consultarle e
          allenarti dalla Home.
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
          <Card style={styles.card}>
            <Meta>SCHEDA ATTIVA</Meta>
            <Heading>{assignment.workoutName}</Heading>
            <Meta>
              Valida dal {assignment.startsAt} al {assignment.expiresAt}
            </Meta>
          </Card>
        ) : (
          <Body>Nessuna scheda attiva assegnata dal coach.</Body>
        )}

        {assignment
          ? workouts
              .filter((item) => item.id === assignment.workoutId)
              .map((item) => (
                <Card key={item.id} style={styles.card}>
                  <Heading>{item.name}</Heading>
                  <Meta>
                    {item.exerciseCount} esercizi · {item.frequency} · in vigore
                  </Meta>
                </Card>
              ))
          : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  card: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});

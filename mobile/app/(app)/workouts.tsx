import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { ApiError } from "../../src/api/client";
import { getWorkouts, type Workout } from "../../src/api";
import {
  Body,
  Card,
  ErrorBanner,
  Heading,
  LoadingBlock,
  Meta,
  PrimaryButton,
  Screen,
} from "../../src/components";
import { spacing } from "../../src/theme";

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchId, setFetchId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);

      try {
        const data = await getWorkouts();
        if (!cancelled) {
          setWorkouts(data);
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
        <PrimaryButton
          label="CREA SCHEDA"
          onPress={() => router.push("/workout/new")}
        />

        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setLoading(true);
              setFetchId((id) => id + 1);
            }}
          />
        ) : null}

        {workouts.length === 0 ? (
          <Body>Nessuna scheda ancora. Creane una per iniziare.</Body>
        ) : (
          workouts.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/workout/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Modifica ${item.name}`}
            >
              <Card style={styles.card}>
                <Heading>{item.name}</Heading>
                <Meta>
                  {item.exerciseCount} esercizi · {item.frequency}
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
    gap: spacing.sm,
  },
  card: {
    marginTop: spacing.sm,
  },
});

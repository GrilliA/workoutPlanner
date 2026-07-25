import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ApiError } from "../../src/api/client";
import { getWorkouts, updateWorkout, type Workout } from "../../src/api";
import {
  Body,
  Card,
  ErrorBanner,
  Heading,
  LoadingBlock,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "../../src/components";
import { colors, spacing } from "../../src/theme";

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [fetchId, setFetchId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);

      try {
        const data = await getWorkouts();
        if (!cancelled) {
          setWorkouts(
            [...data].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          );
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

  const toggleActive = async (workout: Workout) => {
    if (busyId !== null) {
      return;
    }

    setBusyId(workout.id);
    setError(null);

    try {
      const updated = await updateWorkout(workout.id, {
        isActive: !workout.isActive,
      });
      setWorkouts((current) =>
        current.map((item) => (item.id === workout.id ? updated : item)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossibile aggiornare la scheda",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const active = workouts.filter((item) => item.isActive);
  const inactive = workouts.filter((item) => !item.isActive);

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
          <>
            <Meta style={styles.section}>ATTIVE ({active.length})</Meta>
            {active.length === 0 ? (
              <Body>Nessuna scheda attiva. Riattivane una sotto.</Body>
            ) : (
              active.map((item) => (
                <WorkoutCard
                  key={item.id}
                  workout={item}
                  busy={busyId === item.id}
                  onToggle={() => {
                    void toggleActive(item);
                  }}
                />
              ))
            )}

            {inactive.length > 0 ? (
              <>
                <Meta style={styles.section}>DISATTIVATE ({inactive.length})</Meta>
                {inactive.map((item) => (
                  <WorkoutCard
                    key={item.id}
                    workout={item}
                    busy={busyId === item.id}
                    onToggle={() => {
                      void toggleActive(item);
                    }}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

type WorkoutCardProps = {
  workout: Workout;
  busy: boolean;
  onToggle: () => void;
};

function WorkoutCard({ workout, busy, onToggle }: WorkoutCardProps) {
  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => router.push(`/workout/${workout.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Modifica ${workout.name}`}
      >
        <Heading>{workout.name}</Heading>
        <Meta>
          {workout.exerciseCount} esercizi · {workout.frequency}
          {workout.isActive ? "" : " · disattivata"}
        </Meta>
      </Pressable>
      <View style={styles.actions}>
        <SecondaryButton
          label={
            busy
              ? "…"
              : workout.isActive
                ? "Disattiva"
                : "Riattiva"
          }
          onPress={onToggle}
          disabled={busy}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  section: {
    marginTop: spacing.md,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  card: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
});

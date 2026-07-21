import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../src/api/client";
import { getWorkouts, type Workout } from "../../src/api";
import {
  Body,
  ErrorBanner,
  LoadingBlock,
  Screen,
} from "../../src/components/ui";
import { colors, spacing } from "../../src/theme/colors";

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);

    try {
      setWorkouts(await getWorkouts());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen style={styles.noPad}>
      {error ? (
        <View style={styles.pad}>
          <ErrorBanner message={error} onRetry={() => void load()} />
        </View>
      ) : null}
      <FlatList
        data={workouts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Body>Nessun programma. Creane uno dal web per ora.</Body>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.exerciseCount} esercizi
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPad: { padding: 0 },
  pad: { padding: spacing.lg, paddingBottom: 0 },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { color: colors.textHeading, fontWeight: "700", fontSize: 17 },
  meta: { color: colors.text, marginTop: 4 },
});

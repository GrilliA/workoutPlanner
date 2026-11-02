import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { clearApiCache, revokeActiveAssignment } from "../../../api";
import { ApiError } from "../../../api/client";
import { useAuth } from "../../../auth";
import {
  AppText,
  Body,
  BottomSheet,
  Button,
  DangerButton,
  EmptyState,
  ErrorBanner,
  Heading,
  LoadingBlock,
  Screen,
  Title,
  useTabBarInset,
} from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { ActiveProgramCard } from "../activeprogramcard";
import { mapWorkouts } from "../mappers/mapWorkouts";
import type { ActiveProgramModel } from "../types";
import { useWorkoutsData } from "../useWorkoutsData";
import { WorkoutRow } from "../workoutrow";

/** Tab Schede: la scheda in uso, le tue schede e "Nuova scheda". */
export function WorkoutsScreen() {
  const { user } = useAuth();
  const tabBarInset = useTabBarInset();
  const { home, workouts, loading, error, reload } = useWorkoutsData();
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuProgram, setMenuProgram] = useState<ActiveProgramModel | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  if (loading && !home) {
    return <LoadingBlock />;
  }

  const model = home && user ? mapWorkouts(home, workouts, user.id) : null;
  const hasNothing =
    model !== null && model.activeProgram === null && model.myWorkouts.length === 0;
  const hasNoCoach = home?.noProgramReason === "no-coach";

  const cancelCoachProgram = async () => {
    setActionError(null);
    setIsCancelling(true);
    try {
      await revokeActiveAssignment();
      clearApiCache();
      setMenuProgram(null);
      reload();
    } catch (err) {
      setActionError(ApiError.messageFrom(err, "Annullamento non riuscito"));
      setMenuProgram(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const editProgram = (program: ActiveProgramModel) => {
    setMenuProgram(null);
    router.push(`/workout/${program.workoutId}`);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}>
        <Title style={styles.title}>Schede</Title>

        {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}

        {hasNothing ? (
          <EmptyState
            mascot="notebook"
            title="Ancora nessuna scheda"
            body="Creane una tu oppure collega il tuo coach."
            actionLabel="Crea scheda"
            onAction={() => router.push("/workout/new")}
            linkLabel={hasNoCoach ? "Collega coach" : undefined}
            onLink={hasNoCoach ? () => router.push("/(app)/settings/coach") : undefined}
          />
        ) : null}

        {model?.activeProgram ? (
          <ActiveProgramCard
            program={model.activeProgram}
            onOpenMenu={() => setMenuProgram(model.activeProgram)}
          />
        ) : null}

        {model && !hasNothing ? (
          <View style={styles.section}>
            <Heading style={styles.sectionTitle}>Le mie schede</Heading>
            {model.myWorkouts.map((row) => (
              <WorkoutRow
                key={row.workoutId}
                row={row}
                onPress={() => router.push(`/workout/${row.workoutId}`)}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/workout/new")}
              style={({ pressed }) => [styles.newRow, pressed && styles.pressed]}
            >
              <AppText variant="label" tone="accent" style={styles.newLabel}>
                + Nuova scheda
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={menuProgram !== null}
        onClose={() => setMenuProgram(null)}
        title={menuProgram?.name}
      >
        {menuProgram?.isFromCoach ? (
          <View style={styles.sheetBody}>
            <Body style={styles.sheetText}>
              Annullando la scheda del coach torni alle tue schede. Il coach potrà
              assegnartene un&apos;altra.
            </Body>
            <DangerButton
              label="Annulla scheda coach"
              onPress={() => {
                void cancelCoachProgram();
              }}
              disabled={isCancelling}
            />
          </View>
        ) : null}
        {menuProgram && !menuProgram.isFromCoach ? (
          <Button
            variant="secondary"
            label="Modifica scheda"
            onPress={() => editProgram(menuProgram)}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    paddingTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  newRow: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.accentBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  newLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  sheetBody: {
    gap: spacing.sm,
  },
  sheetText: {
    textAlign: "center",
  },
});

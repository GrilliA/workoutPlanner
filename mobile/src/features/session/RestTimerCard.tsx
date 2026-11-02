import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { AppText, Mascot } from "../../components";
import { colors, radii, spacing } from "../../theme";

type RestTimerCardProps = {
  status: "idle" | "running" | "done";
  remainingSec: number;
  /** Durata del recupero in corso, per la barra che si svuota. */
  totalSec?: number;
  /** Secondi riposo consigliati (prossima serie) quando idle. */
  suggestedSec?: number;
  onSkip: () => void;
  onStartSuggested?: () => void;
};

const DONE_HOLD_MS = 350;

const formatCountdown = (remainingSec: number): string => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

function fadeOut(
  progress: Animated.Value,
  delay = 0,
): Animated.CompositeAnimation {
  return Animated.timing(progress, {
    toValue: 0,
    duration: 220,
    delay,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
}

/**
 * Recupero: riga «consigliato + Avvia» da fermo;
 * palco con mascotte, countdown e Salta mentre scorre.
 */
export function RestTimerCard({
  status,
  remainingSec,
  totalSec = 0,
  suggestedSec = 0,
  onSkip,
  onStartSuggested,
}: RestTimerCardProps) {
  const showSuggested =
    status === "idle" && suggestedSec > 0 && Boolean(onStartSuggested);
  const [mounted, setMounted] = useState(
    status === "running" || status === "done" || showSuggested,
  );
  const progress = useRef(
    new Animated.Value(status === "running" || showSuggested ? 1 : 0),
  ).current;
  const activeAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    activeAnim.current?.stop();

    if (status === "running" || showSuggested) {
      setMounted(true);
      activeAnim.current = Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      activeAnim.current.start();
      return;
    }

    if (status === "done") {
      setMounted(true);
      activeAnim.current = fadeOut(progress, DONE_HOLD_MS);
      activeAnim.current.start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
      return;
    }

    activeAnim.current = fadeOut(progress);
    activeAnim.current.start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [progress, showSuggested, status]);

  if (!mounted) {
    return null;
  }

  const isDone = status === "done" || (status === "running" && remainingSec <= 0);
  const showStage = status === "running" || status === "done";
  const showSkip = status === "running" && remainingSec > 0;
  const ratio =
    totalSec > 0 ? Math.max(0, Math.min(1, remainingSec / totalSec)) : 0;

  return (
    <Animated.View
      style={[styles.shell, { opacity: progress }]}
      pointerEvents="auto"
    >
      {showStage ? (
        <View style={[styles.stage, isDone && styles.stageDone]}>
          <View style={styles.stageTop}>
            <Mascot name="sleeping" size={72} />
            <AppText variant="eyebrow" style={styles.eyebrow}>
              {isDone ? "Recupero finito" : "Recupero"}
            </AppText>
          </View>
          <AppText variant="title" style={styles.clock}>
            {formatCountdown(isDone ? 0 : remainingSec)}
          </AppText>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: totalSec,
              now: isDone ? 0 : remainingSec,
            }}
          >
            <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
          </View>
          {showSkip ? (
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel="Salta recupero"
              style={({ pressed }) => [
                styles.skip,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.skipLabel}>Salta recupero</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.suggestBar}>
          <AppText variant="label" style={styles.suggestLabel} numberOfLines={1}>
            {`Recupero consigliato: ${formatCountdown(suggestedSec)}`}
          </AppText>
          <Pressable
            onPress={onStartSuggested}
            accessibilityRole="button"
            accessibilityLabel="Avvia recupero consigliato"
            style={({ pressed }) => [
              styles.suggestAction,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.suggestActionLabel}>Avvia</AppText>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  stage: {
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.dataBg,
    borderWidth: 1.5,
    borderColor: colors.dataBg,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stageDone: {
    borderColor: colors.data,
  },
  stageTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.data,
    fontSize: 15,
  },
  clock: {
    color: colors.data,
    fontVariant: ["tabular-nums"],
    fontSize: 64,
    lineHeight: 72,
    fontWeight: "800",
    textAlign: "center",
  },
  track: {
    alignSelf: "stretch",
    height: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.data,
    borderRadius: radii.pill,
  },
  skip: {
    alignSelf: "stretch",
    minHeight: 52,
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  skipLabel: {
    color: colors.onInk,
    fontSize: 16,
    fontWeight: "800",
  },
  suggestBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.dataBg,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingLeft: spacing.md,
    paddingRight: 6,
  },
  suggestLabel: {
    flex: 1,
    color: colors.data,
    fontWeight: "700",
  },
  suggestAction: {
    minHeight: 40,
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  suggestActionLabel: {
    color: colors.onInk,
    fontSize: 14,
    fontWeight: "800",
  },
});

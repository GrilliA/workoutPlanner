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
            <AppText variant="eyebrow" tone="muted" style={styles.eyebrow}>
              {isDone ? "RECUPERO FINITO" : "RECUPERO"}
            </AppText>
          </View>
          <AppText variant="title" tone="accent" style={styles.clock}>
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
              <AppText style={styles.skipLabel}>SALTA</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.suggestBar}>
          <AppText
            variant="eyebrow"
            tone="accent"
            style={styles.suggestLabel}
            numberOfLines={1}
          >
            {`RIPOSO CONSIGLIATO: ${formatCountdown(suggestedSec)}`}
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
            <AppText style={styles.suggestActionLabel}>AVVIA</AppText>
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
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  stageDone: {
    borderColor: colors.accent,
  },
  stageTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  eyebrow: {
    letterSpacing: 1.2,
    fontSize: 13,
  },
  clock: {
    fontVariant: ["tabular-nums"],
    fontSize: 64,
    lineHeight: 72,
    fontWeight: "700",
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
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  skip: {
    alignSelf: "stretch",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  skipLabel: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  suggestBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  suggestLabel: {
    flex: 1,
    letterSpacing: 1,
    fontSize: 11,
  },
  suggestAction: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestActionLabel: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});

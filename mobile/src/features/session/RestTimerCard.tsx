import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";

type RestTimerCardProps = {
  status: "idle" | "running" | "done";
  remainingSec: number;
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
 * Barra riposo compatta (mock): consigliato+AVVIA in idle, countdown+SALTA in running.
 */
export function RestTimerCard({
  status,
  remainingSec,
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
  const showSkip = status === "running" && remainingSec > 0;

  const label = isDone
    ? "RECUPERO FINITO"
    : status === "running"
      ? `RECUPERO ${formatCountdown(remainingSec)}`
      : `RIPOSO CONSIGLIATO: ${formatCountdown(suggestedSec)}`;

  return (
    <Animated.View
      style={[styles.shell, { opacity: progress }]}
      pointerEvents="auto"
    >
      <View style={[styles.bar, isDone && styles.barDone]}>
        <AppText variant="eyebrow" tone="accent" style={styles.label} numberOfLines={1}>
          {label}
        </AppText>
        {showSkip ? (
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
          >
            <AppText style={styles.actionLabel}>SALTA</AppText>
          </Pressable>
        ) : null}
        {showSuggested ? (
          <Pressable
            onPress={onStartSuggested}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              pressed && styles.actionPressed,
            ]}
          >
            <AppText style={styles.actionLabel}>AVVIA</AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  bar: {
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
  barDone: {
    borderColor: colors.accent,
  },
  label: {
    flex: 1,
    letterSpacing: 1,
    fontSize: 11,
  },
  action: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionLabel: {
    color: colors.onAccent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});

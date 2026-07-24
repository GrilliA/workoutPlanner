import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";

type RestTimerCardProps = {
  status: "idle" | "running" | "done";
  remainingSec: number;
  onSkip: () => void;
};

/** Approx card height incl. margins — collapse senza jump sulla lista. */
const CARD_HEIGHT = 156;
const DONE_HOLD_MS = 350;

const formatCountdown = (remainingSec: number): string => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return `${seconds}s`;
};

function collapse(
  progress: Animated.Value,
  onDone: () => void,
  delay = 0,
): Animated.CompositeAnimation {
  return Animated.timing(progress, {
    toValue: 0,
    duration: 260,
    delay,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: false,
  });
}

/** Card recupero: compare/scompare con collapse altezza (niente jump sulla lista). */
export function RestTimerCard({
  status,
  remainingSec,
  onSkip,
}: RestTimerCardProps) {
  const [mounted, setMounted] = useState(status === "running");
  const progress = useRef(new Animated.Value(status === "running" ? 1 : 0)).current;
  const activeAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    activeAnim.current?.stop();

    if (status === "running") {
      setMounted(true);
      activeAnim.current = Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      activeAnim.current.start();
      return;
    }

    if (status === "done") {
      setMounted(true);
      activeAnim.current = collapse(progress, () => setMounted(false), DONE_HOLD_MS);
      activeAnim.current.start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
      return;
    }

    // idle (skip / cancel): collapse subito se ancora montata
    activeAnim.current = collapse(progress, () => setMounted(false));
    activeAnim.current.start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [progress, status]);

  if (!mounted) {
    return null;
  }

  const isDone = status === "done" || remainingSec <= 0;
  const showSkip = status === "running" && remainingSec > 0;

  return (
    <Animated.View
      style={[
        styles.shell,
        {
          opacity: progress,
          maxHeight: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, CARD_HEIGHT],
          }),
          marginVertical: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, spacing.sm],
          }),
        },
      ]}
      pointerEvents={showSkip ? "auto" : "none"}
    >
      <View style={[styles.timer, isDone && styles.timerDone]}>
        <AppText variant="eyebrow" tone="accent" style={styles.label}>
          {isDone ? "Recupero finito" : "RECUPERO"}
        </AppText>
        <AppText
          tone="heading"
          style={styles.value}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {isDone ? "✓" : formatCountdown(remainingSec)}
        </AppText>
        <View style={styles.skipSlot}>
          {showSkip ? (
            <Pressable
              onPress={onSkip}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.skip,
                pressed && styles.skipPressed,
              ]}
            >
              <AppText tone="heading" style={styles.skipLabel}>
                SALTA RECUPERO
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    overflow: "hidden",
  },
  timer: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 132,
    width: "100%",
  },
  timerDone: {
    borderColor: colors.accent,
  },
  label: {
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 58,
    color: colors.textHeading,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    includeFontPadding: false,
  },
  skipSlot: {
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  skipPlaceholder: {
    height: 40,
  },
  skip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipPressed: {
    opacity: 0.7,
  },
  skipLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});

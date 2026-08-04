import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";

type RestTimerCardProps = {
  status: "idle" | "running" | "done";
  remainingSec: number;
  onSkip: () => void;
};

const DONE_HOLD_MS = 350;

const formatCountdown = (remainingSec: number): string => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return `${seconds}s`;
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

/** Sticky chrome recupero: idle = nessun spazio; running/done a altezza naturale. */
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

    // idle (skip / cancel): fade subito se ancora montata
    activeAnim.current = fadeOut(progress);
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
      style={[styles.shell, { opacity: progress }]}
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
    alignSelf: "stretch",
  },
  timer: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentBorder,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
  },
  timerDone: {
    borderColor: colors.accent,
    backgroundColor: colors.accentBg,
  },
  label: {
    letterSpacing: 1.4,
    fontSize: 13,
  },
  value: {
    fontSize: 64,
    fontWeight: "700",
    lineHeight: 72,
    color: colors.accent,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    includeFontPadding: false,
  },
  skipSlot: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    paddingHorizontal: spacing.lg,
  },
  skipPlaceholder: {
    height: 44,
  },
  skip: {
    alignSelf: "stretch",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  skipPressed: {
    opacity: 0.7,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
});

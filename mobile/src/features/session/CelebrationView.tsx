import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button } from "../../components";
import { colors, radii, spacing } from "../../theme";
import {
  formatDurationLabel,
  formatVolumeLabel,
} from "./celebrationStats";

export type CelebrationViewProps = {
  workoutName: string;
  volumeKg: number;
  durationMin: number;
  /** Serie registrate nella sessione. */
  setCount: number;
  /** Shown under the title when the session is not on the server yet. */
  syncNote?: string;
  onDone: () => void;
};

function Particle({ delayMs, x }: { delayMs: number; x: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delayMs, progress]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            { translateX: x },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -56],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1.1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

/** Fine allenamento "Sole": fondo arancio, tre tile crema, bottone ink. */
export function CelebrationView({
  workoutName,
  volumeKg,
  durationMin,
  setCount,
  syncNote,
  onDone,
}: CelebrationViewProps) {
  const insets = useSafeAreaInsets();
  const title = useRef(new Animated.Value(0)).current;
  const stats = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(title, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(stats, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(cta, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cta, stats, title]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.xl),
        },
      ]}
    >
      <View style={styles.hero}>
        <View style={styles.badgeWrap}>
          <Particle delayMs={80} x={-48} />
          <Particle delayMs={140} x={8} />
          <Particle delayMs={200} x={52} />
        </View>

        <Animated.View style={[styles.titleBlock, { opacity: title }]}>
          <AppText style={styles.title}>Allenamento fatto!</AppText>
          <AppText style={styles.subtitle}>{workoutName}</AppText>
          {syncNote ? <AppText style={styles.syncNote}>{syncNote}</AppText> : null}
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.stats,
          {
            opacity: stats,
            transform: [
              {
                translateY: stats.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ResultTile label="Durata" value={formatDurationLabel(durationMin)} />
        <ResultTile label="Volume" value={formatVolumeLabel(volumeKg)} />
        <ResultTile label="Serie" value={String(setCount)} />
      </Animated.View>

      <Animated.View
        style={[
          styles.cta,
          {
            opacity: cta,
            transform: [
              {
                translateY: cta.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Button variant="ink" label="Torna alla Home" onPress={onDone} />
      </Animated.View>
    </View>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <AppText style={styles.tileLabel}>{label}</AppText>
      <AppText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.xl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
  },
  badgeWrap: {
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    top: 0,
  },
  titleBlock: {
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    color: colors.onAccent,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  subtitle: {
    color: colors.onAccent,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  syncNote: {
    color: colors.onAccent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  tileLabel: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
  },
  tileValue: {
    color: colors.textHeading,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  cta: {
    marginTop: spacing.sm,
  },
});

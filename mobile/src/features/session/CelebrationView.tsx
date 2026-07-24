import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { PrimaryButton, StatCard, Title } from "../../components";
import { colors, radii, spacing } from "../../theme";
import {
  formatDurationLabel,
  formatVolumeLabel,
} from "./celebrationStats";

export type CelebrationViewProps = {
  workoutName: string;
  volumeKg: number;
  durationMin: number;
  onDone: () => void;
};

function CheckBadge({ progress }: { progress: Animated.Value }) {
  const scale = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.4, 1.12, 1],
  });

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          opacity: progress,
          transform: [{ scale }],
        },
      ]}
    >
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle
          cx={36}
          cy={36}
          r={34}
          fill={colors.accentBg}
          stroke={colors.accent}
          strokeWidth={2}
        />
        <Path
          d="M22 37.5 31.5 47 50 26"
          fill="none"
          stroke={colors.accent}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

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

/** Schermata fine workout: check animato, volume + durata, CTA home. */
export function CelebrationView({
  workoutName,
  volumeKg,
  durationMin,
  onDone,
}: CelebrationViewProps) {
  const insets = useSafeAreaInsets();
  const badge = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const stats = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(badge, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
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
  }, [badge, cta, stats, title]);

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: Math.max(insets.bottom, spacing.xl) },
      ]}
    >
      <View style={styles.hero}>
        <View style={styles.badgeWrap}>
          <Particle delayMs={80} x={-28} />
          <Particle delayMs={140} x={8} />
          <Particle delayMs={200} x={32} />
          <CheckBadge progress={badge} />
        </View>

        <Animated.View style={{ opacity: title }}>
          <Title style={styles.title}>Workout concluso</Title>
        </Animated.View>

        <Animated.View style={{ opacity: title }}>
          <Animated.Text style={styles.subtitle}>{workoutName}</Animated.Text>
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
        <StatCard label="Volume" value={formatVolumeLabel(volumeKg)} />
        <StatCard label="Durata" value={formatDurationLabel(durationMin)} />
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
        <PrimaryButton label="Torna a Home" onPress={onDone} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.xl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
  },
  badgeWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  badge: {
    width: 72,
    height: 72,
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    top: 28,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cta: {
    marginTop: spacing.sm,
  },
});

import { createLiveActivity } from "expo-widgets";
import type { LiveActivityEnvironment } from "expo-widgets";
import { HStack, Image, ProgressView, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  monospacedDigit,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";

type RestTimerActivityProps = {
  startedAtMs: number;
  endsAtMs: number;
};

const RestTimerActivity = (
  props: RestTimerActivityProps,
  environment: LiveActivityEnvironment,
) => {
  "widget";

  const accent = environment.isLuminanceReduced ? "#ffffff" : "#bfdbf7";
  const timerInterval = {
    lower: new Date(props.startedAtMs),
    upper: new Date(props.endsAtMs),
  };

  const countdown = (
    <Text
      timerInterval={timerInterval}
      countsDown
      modifiers={[font({ size: 28, weight: "bold" }), monospacedDigit(), foregroundStyle(accent)]}
    />
  );

  return {
    banner: (
      <VStack spacing={8} modifiers={[padding()]}>
        <HStack spacing={6}>
          <Image systemName="timer" color={accent} />
          <Text modifiers={[font({ weight: "semibold" }), foregroundStyle(accent)]}>
            Recupero
          </Text>
        </HStack>
        {countdown}
        <ProgressView timerInterval={timerInterval} countsDown modifiers={[tint(accent)]} />
      </VStack>
    ),
    compactLeading: <Image systemName="timer" color={accent} />,
    compactTrailing: (
      <Text
        timerInterval={timerInterval}
        countsDown
        modifiers={[monospacedDigit(), foregroundStyle(accent)]}
      />
    ),
    minimal: <Image systemName="timer" color={accent} />,
    expandedLeading: <Image systemName="timer" color={accent} />,
    expandedTrailing: (
      <VStack spacing={2}>
        <Text modifiers={[font({ textStyle: "caption" })]}>Recupero</Text>
        <Text
          timerInterval={timerInterval}
          countsDown
          modifiers={[font({ weight: "bold" }), monospacedDigit(), foregroundStyle(accent)]}
        />
      </VStack>
    ),
    expandedBottom: (
      <ProgressView timerInterval={timerInterval} countsDown modifiers={[tint(accent)]} />
    ),
  };
};

const restTimerActivity = createLiveActivity(
  "RestTimerActivity",
  RestTimerActivity,
);

export default restTimerActivity;

export const startRestTimerActivity = (input: {
  sessionId: number;
  startedAtMs: number;
  endsAtMs: number;
}): void => {
  try {
    restTimerActivity.start(
      { startedAtMs: input.startedAtMs, endsAtMs: input.endsAtMs },
      `traccia://session/${input.sessionId}`,
    );
  } catch {
    // Simulatori o iOS < 16.2 senza supporto Live Activity.
  }
};

export const endRestTimerActivities = (): void => {
  try {
    for (const instance of restTimerActivity.getInstances()) {
      void instance.end("immediate").catch(() => undefined);
    }
  } catch {
    // Live Activity non supportata su questo dispositivo.
  }
};

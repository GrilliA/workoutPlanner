import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radii } from "../../theme";

type ExerciseMediaFlipProps = {
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
  variant?: "thumb" | "hero";
  /** Smaller thumb. Ignored when variant is hero. */
  compact?: boolean;
  /** Keep a reserved slot when there is no catalog photo. */
  placeholder?: boolean;
};

/** 0.jpg / 1.jpg flip. Optional empty slot when media is missing. */
export function ExerciseMediaFlip(props: ExerciseMediaFlipProps) {
  const startUrl = props.imageUrl?.trim() || "";
  const endUrl = props.imageUrlEnd?.trim() || "";
  return <ExerciseMediaFlipView key={`${startUrl}|${endUrl}`} {...props} />;
}

function ExerciseMediaFlipView({
  imageUrl,
  imageUrlEnd,
  variant = "thumb",
  compact = false,
  placeholder = false,
}: ExerciseMediaFlipProps) {
  const [frame, setFrame] = useState<0 | 1>(0);
  const [startFailed, setStartFailed] = useState(false);
  const [endFailed, setEndFailed] = useState(false);
  const startUrl = imageUrl?.trim() || null;
  const endUrl = imageUrlEnd?.trim() || null;
  const canFlip = Boolean(startUrl && endUrl && !startFailed && !endFailed);
  const isHero = variant === "hero";
  const showStart = Boolean(startUrl && !startFailed);
  const showEnd = Boolean(endUrl && (!endFailed || !startUrl));

  useEffect(() => {
    if (!canFlip) {
      return;
    }

    const timer = setInterval(() => {
      setFrame((current) => (current === 0 ? 1 : 0));
    }, 900);

    return () => clearInterval(timer);
  }, [canFlip]);

  const frameStyle = [
    isHero ? styles.hero : styles.thumb,
    !isHero && compact ? styles.thumbCompact : null,
  ];

  if ((!startUrl && !endUrl) || (startFailed && (endFailed || !endUrl))) {
    if (!placeholder) {
      return null;
    }

    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[frameStyle, styles.empty]}
      />
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Foto movimento esercizio"
      style={frameStyle}
    >
      {showStart ? (
        <Image
          source={startUrl}
          cachePolicy="memory-disk"
          contentFit={isHero ? "contain" : "cover"}
          transition={0}
          onError={() => setStartFailed(true)}
          style={styles.image}
        />
      ) : null}
      {showEnd ? (
        <Image
          source={endUrl}
          cachePolicy="memory-disk"
          contentFit={isHero ? "contain" : "cover"}
          transition={0}
          onError={() => {
            setEndFailed(true);
            setFrame(0);
          }}
          style={[styles.image, { opacity: showStart && frame === 0 ? 0 : 1 }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbCompact: {
    width: 56,
    height: 56,
  },
  hero: {
    width: "100%",
    height: 176,
    overflow: "hidden",
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  empty: {
    borderStyle: "dashed",
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
});

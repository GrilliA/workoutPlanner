import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, BackButton, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";

type SessionFocusHeaderProps = {
  workoutName: string;
  exerciseIndex: number;
  exerciseTotal: number;
  startedAt: Date;
  endedAt: Date | null;
  statusLabel: string;
  /** Un segmento per esercizio: fatto (arancio), in corso (ink), da fare. */
  segments: ExerciseSegment[];
  onBack?: () => void;
};

export type ExerciseSegment = "done" | "current" | "todo";

/** Header sessione: back, nome, tempo trascorso e barra a segmenti degli esercizi. */
export function SessionFocusHeader({
  workoutName,
  exerciseIndex,
  exerciseTotal,
  startedAt,
  endedAt,
  statusLabel,
  segments,
  onBack,
}: SessionFocusHeaderProps) {
  const doneCount = segments.filter((segment) => segment === "done").length;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.side}>
          {onBack ? <BackButton onPress={onBack} /> : null}
        </View>
        <View style={styles.center}>
          <Meta style={styles.status}>{statusLabel}</Meta>
          <AppText tone="heading" style={styles.title} numberOfLines={1}>
            {workoutName}
          </AppText>
          {exerciseTotal > 0 ? (
            <Meta style={styles.exerciseMeta}>
              Esercizio {exerciseIndex + 1} di {exerciseTotal}
            </Meta>
          ) : null}
        </View>
        <View style={[styles.side, styles.sideEnd]}>
          {endedAt ? (
            <AppText style={styles.elapsed}>
              {formatElapsed(startedAt, endedAt.getTime())}
            </AppText>
          ) : (
            <ElapsedClock startedAt={startedAt} />
          )}
        </View>
      </View>
      {segments.length > 0 ? (
        <View
          style={styles.segments}
          accessibilityRole="progressbar"
          accessibilityLabel={`${doneCount} esercizi fatti su ${segments.length}`}
        >
          {segments.map((segment, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                segment === "done" && styles.segmentDone,
                segment === "current" && styles.segmentCurrent,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatElapsed(startedAt: Date, nowMs: number): string {
  const totalSec = Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ElapsedClock({ startedAt }: { startedAt: Date }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AppText style={styles.elapsed}>
      {formatElapsed(startedAt, nowMs)}
    </AppText>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  side: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideEnd: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    minWidth: 0,
  },
  status: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.text,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  exerciseMeta: {
    fontSize: 12,
    color: colors.text,
  },
  elapsed: {
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    fontSize: 16,
    color: colors.textHeading,
  },
  segments: {
    flexDirection: "row",
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  segmentDone: {
    backgroundColor: colors.accent,
  },
  segmentCurrent: {
    backgroundColor: colors.ink,
  },
});

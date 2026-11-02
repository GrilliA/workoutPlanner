import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText, BottomSheet, Button, Meta } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import type { WorkoutChoiceSection, WorkoutSelection } from "../types";

type ChangeWorkoutSheetProps = {
  visible: boolean;
  sections: WorkoutChoiceSection[];
  selection: WorkoutSelection | null;
  onConfirm: (selection: WorkoutSelection) => void;
  onClose: () => void;
};

/** "Cosa vuoi allenare?": un giorno per riga, raggruppati per scheda. */
export function ChangeWorkoutSheet({
  visible,
  sections,
  selection,
  onConfirm,
  onClose,
}: ChangeWorkoutSheetProps) {
  const [pending, setPending] = useState<WorkoutSelection | null>(selection);

  // Ogni apertura riparte dalla selezione corrente della Home.
  useEffect(() => {
    if (visible) {
      setPending(selection);
    }
  }, [visible, selection]);

  const onPressConfirm = () => {
    if (pending) {
      onConfirm(pending);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cosa vuoi allenare?">
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {sections.map((section) => (
          <View key={section.workoutId} style={styles.section}>
            <AppText variant="meta" style={styles.sectionTitle}>
              {section.title}
            </AppText>
            {section.rows.map((row) => {
              const isSelected =
                pending?.workoutId === section.workoutId &&
                pending.workoutDayId === row.workoutDayId;
              return (
                <Pressable
                  key={row.workoutDayId}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() =>
                    setPending({
                      workoutId: section.workoutId,
                      workoutDayId: row.workoutDayId,
                    })
                  }
                  style={({ pressed }) => [
                    styles.row,
                    isSelected && styles.rowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rowText}>
                    <AppText tone="heading" style={styles.rowTitle}>
                      {row.name}
                    </AppText>
                    <Meta>{row.meta}</Meta>
                  </View>
                  {isSelected ? <SelectedMark /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Button label="Conferma" onPress={onPressConfirm} disabled={!pending} />
    </BottomSheet>
  );
}

function SelectedMark() {
  return (
    <Svg width={24} height={24} viewBox="0 0 22 22" aria-hidden>
      <Circle cx={11} cy={11} r={10.4} fill={colors.accent} />
      <Path
        d="M6.5 11.4l3 3 6-6.3"
        fill="none"
        stroke={colors.onAccent}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 420,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    marginLeft: 2,
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentBg,
  },
  pressed: {
    opacity: 0.7,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
});

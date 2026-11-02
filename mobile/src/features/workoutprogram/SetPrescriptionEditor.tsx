import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AppText, Meta, SecondaryButton } from "../../components";
import { colors, radii, spacing } from "../../theme";
import { MAX_SETS_PER_EXERCISE } from "../../api/schemas/exercise";
import {
  copyPrescription,
  newPrescription,
  REST_SEC_OPTIONS,
  type DraftPrescription,
} from "./prescriptionDraft";

const REP_CHOICES = Array.from({ length: 30 }, (_, index) => String(index + 1));
const REST_CHOICES = REST_SEC_OPTIONS.map((seconds) => String(seconds));
const REEL_HEIGHT = 44;
/** Più basso della finestra: sopra e sotto spunta circa metà cifra. */
const REPS_ITEM_SIZE = 22;
const REST_ITEM_SIZE = 64;
/** Debounce: senza eventi di scroll per questo tempo, il valore più vicino entra nella lente. */
const SETTLE_AFTER_MS = 150;

/** Tiene il valore corrente anche se non è nella lista (es. reps 40 o recupero importato). */
function choicesWithCurrent(
  choices: readonly string[],
  current: string,
): string[] {
  if (current === "" || choices.includes(current)) {
    return [...choices];
  }
  const currentNumber = Number(current);
  if (!Number.isFinite(currentNumber)) {
    return [...choices];
  }
  return [...choices, current].sort((left, right) => Number(left) - Number(right));
}

type ScrollAxis = "x" | "y";

type ScrollChoiceProps = {
  choices: readonly string[];
  value: string;
  /** Larghezza della cella se `axis` è x, altezza se è y. */
  itemSize: number;
  axis: ScrollAxis;
  format?: (choice: string) => string;
  onChange: (choice: string) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function offsetOf(event: NativeSyntheticEvent<NativeScrollEvent>, axis: ScrollAxis) {
  return axis === "y"
    ? event.nativeEvent.contentOffset.y
    : event.nativeEvent.contentOffset.x;
}

/** Il valore nella lente è quello scelto. Appena lo scroll si ferma, il più vicino ci entra. */
function ScrollChoice({
  choices,
  value,
  itemSize,
  axis,
  format = (choice) => choice,
  onChange,
  accessibilityLabel,
  disabled = false,
  style,
}: ScrollChoiceProps) {
  const listRef = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestOffset = useRef(0);
  const isDragging = useRef(false);
  /** Indice verso cui sta già scattando: il sync non deve interrompere l'animazione. */
  const snappingTo = useRef<number | null>(null);
  const [viewport, setViewport] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const sideInset = Math.max(0, (viewport - itemSize) / 2);
  const selectedIndex = Math.max(0, choices.indexOf(value));
  const isVertical = axis === "y";

  const scrollToIndex = (index: number, animated: boolean) => {
    const offset = index * itemSize;
    if (isVertical) {
      listRef.current?.scrollTo({ y: offset, animated });
      return;
    }
    listRef.current?.scrollTo({ x: offset, animated });
  };

  const clearSettleTimer = () => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  useEffect(() => clearSettleTimer, []);

  useEffect(() => {
    // Durante il gesto o lo scatto comanda il dito, non il valore.
    if (viewport === 0 || isDragging.current || settleTimer.current) {
      return;
    }
    if (snappingTo.current === selectedIndex) {
      snappingTo.current = null;
      return;
    }
    scrollToIndex(selectedIndex, false);
    setScrollOffset(selectedIndex * itemSize);
  }, [itemSize, selectedIndex, viewport]);

  /** Scatta sul numero più vicino e lo mette nella bozza. */
  const settle = () => {
    settleTimer.current = null;
    const index = Math.min(
      choices.length - 1,
      Math.max(0, Math.round(latestOffset.current / itemSize)),
    );
    snappingTo.current = index;
    scrollToIndex(index, true);
    setScrollOffset(index * itemSize);
    const next = choices[index];
    if (next !== undefined && next !== value) {
      onChange(next);
    }
  };
  const settleRef = useRef(settle);
  settleRef.current = settle;

  const scheduleSettle = () => {
    clearSettleTimer();
    settleTimer.current = setTimeout(() => settleRef.current(), SETTLE_AFTER_MS);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    setViewport(isVertical ? layout.height : layout.width);
  };

  const lensStyle = isVertical
    ? { top: sideInset, height: itemSize, left: 4, right: 4 }
    : { left: sideInset, width: itemSize, top: 4, bottom: 4 };
  const contentInsetStyle = isVertical
    ? { paddingVertical: sideInset }
    : { paddingHorizontal: sideInset };
  // Senza un valore (bozza vuota) lo screen reader legge il primo della lista, come la lente.
  const announcedChoice = value === "" ? (choices[0] ?? "") : value;

  return (
    <View
      style={[styles.reel, style]}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: format(announcedChoice) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
        const next = choices[selectedIndex + step];
        if (!disabled && next !== undefined) {
          onChange(next);
        }
      }}
    >
      {isVertical ? null : (
        <View pointerEvents="none" style={[styles.reelLens, lensStyle]} />
      )}
      <ScrollView
        ref={listRef}
        horizontal={!isVertical}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.reelScroll}
        scrollEnabled={!disabled && viewport > 0}
        directionalLockEnabled
        nestedScrollEnabled
        contentContainerStyle={contentInsetStyle}
        onScroll={(event) => {
          const offset = offsetOf(event, axis);
          latestOffset.current = offset;
          setScrollOffset(offset);
          // Anche l'inerzia (e il web, senza eventi di fine) rinvia lo scatto.
          if (!isDragging.current) {
            scheduleSettle();
          }
        }}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isDragging.current = true;
          snappingTo.current = null;
          clearSettleTimer();
        }}
        onScrollEndDrag={(event) => {
          isDragging.current = false;
          latestOffset.current = offsetOf(event, axis);
          scheduleSettle();
        }}
      >
        {choices.map((choice, index) => {
          const distance = Math.abs(scrollOffset / itemSize - index);
          const isCentered = distance < 0.5;
          const itemStyle = isVertical
            ? { height: itemSize, width: "100%" as const }
            : { width: itemSize, height: REEL_HEIGHT };
          return (
            <View key={choice} style={[styles.reelItem, itemStyle]}>
              <AppText
                style={[
                  styles.reelLabel,
                  isCentered && styles.reelLabelOn,
                  isCentered && isVertical && styles.reelLabelReps,
                ]}
              >
                {format(choice)}
              </AppText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

type SetPrescriptionEditorProps = {
  prescriptions: DraftPrescription[];
  onChange: (next: DraftPrescription[]) => void;
  disabled?: boolean;
};

/** Editor serie: reps e recupero diversi per set (#1 10×90s, #2 8×120s, …). */
export function SetPrescriptionEditor({
  prescriptions,
  onChange,
  disabled = false,
}: SetPrescriptionEditorProps) {
  const updateAt = (key: string, patch: Partial<DraftPrescription>) => {
    onChange(
      prescriptions.map((item) =>
        item.key === key ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeAt = (key: string) => {
    if (prescriptions.length <= 1) {
      return;
    }
    onChange(prescriptions.filter((item) => item.key !== key));
  };

  const addSet = () => {
    const last = prescriptions.at(-1);
    const nextSet = last ? copyPrescription(last) : newPrescription("10", 90);
    onChange([...prescriptions, nextSet]);
  };

  return (
    <View style={[styles.root, disabled && styles.dimmed]}>
      <View
        style={styles.header}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppText
          variant="eyebrow"
         
          style={[styles.headerLabel, styles.indexCol]}
        >
          Serie
        </AppText>
        <AppText
          variant="eyebrow"
         
          style={[styles.headerLabel, styles.repsCol]}
        >
          Reps
        </AppText>
        <AppText
          variant="eyebrow"
         
          style={[styles.headerLabel, styles.restCol]}
        >
          Recupero
        </AppText>
        <View style={styles.removeCol} />
      </View>
      {prescriptions.map((item, index) => {
        const repChoices = choicesWithCurrent(REP_CHOICES, item.reps);
        const restChoices = choicesWithCurrent(REST_CHOICES, String(item.restSec));
        return (
          <View key={item.key} style={styles.setRow}>
            <AppText tone="heading" style={[styles.indexCol, styles.setIndex]}>
              {index + 1}
            </AppText>
            <ScrollChoice
              choices={repChoices}
              value={item.reps}
              itemSize={REPS_ITEM_SIZE}
              axis="y"
              onChange={(reps) => updateAt(item.key, { reps })}
              accessibilityLabel={`Ripetizioni serie ${index + 1}`}
              disabled={disabled}
              style={styles.repsReel}
            />
            <ScrollChoice
              choices={restChoices}
              value={String(item.restSec)}
              itemSize={REST_ITEM_SIZE}
              axis="x"
              format={(choice) => `${choice}s`}
              onChange={(choice) =>
                updateAt(item.key, { restSec: Number(choice) })
              }
              accessibilityLabel={`Recupero serie ${index + 1}`}
              disabled={disabled}
              style={styles.restReel}
            />
            {prescriptions.length > 1 ? (
              <Pressable
                onPress={() => removeAt(item.key)}
                disabled={disabled}
                hitSlop={8}
                style={styles.removeCol}
                accessibilityRole="button"
                accessibilityLabel={`Rimuovi serie ${index + 1}`}
              >
                <Meta style={styles.remove}>×</Meta>
              </Pressable>
            ) : (
              <View style={styles.removeCol} />
            )}
          </View>
        );
      })}
      <SecondaryButton
        label="+ Aggiungi serie"
        onPress={addSet}
        disabled={disabled || prescriptions.length >= MAX_SETS_PER_EXERCISE}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  headerLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  indexCol: {
    width: 40,
  },
  setIndex: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
  repsCol: {
    width: 48,
  },
  restCol: {
    flex: 1,
  },
  reel: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: "hidden",
    justifyContent: "center",
  },
  reelScroll: {
    flex: 1,
  },
  repsReel: {
    width: 48,
    height: REEL_HEIGHT,
    backgroundColor: colors.bg,
  },
  restReel: {
    flex: 1,
    height: REEL_HEIGHT,
  },
  reelLens: {
    position: "absolute",
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  reelItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  reelLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  reelLabelOn: {
    color: colors.textHeading,
    fontSize: 16,
    fontWeight: "800",
  },
  reelLabelReps: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
  },
  removeCol: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  remove: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: "700",
  },
  dimmed: {
    opacity: 0.5,
  },
});

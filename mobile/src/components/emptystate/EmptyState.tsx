import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";
import { AppText, Body, Heading } from "../text";
import { Button } from "../button";
import { Mascot, type MascotName } from "../mascot";

type EmptyStateProps = {
  mascot: MascotName;
  title: string;
  body?: string;
  /** Bottone principale (max 280px, come da mockup). */
  actionLabel?: string;
  onAction?: () => void;
  /** Link testuale secondario sotto il bottone. */
  linkLabel?: string;
  onLink?: () => void;
};

/** Stato vuoto stile Telegram: mascotte centrata, titolo, una riga, un bottone. */
export function EmptyState({
  mascot,
  title,
  body,
  actionLabel,
  onAction,
  linkLabel,
  onLink,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Mascot name={mascot} />
      <Heading style={styles.title}>{title}</Heading>
      {body ? <Body style={styles.body}>{body}</Body> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
      {linkLabel && onLink ? (
        <Pressable
          onPress={onLink}
          accessibilityRole="link"
          hitSlop={8}
          style={({ pressed }) => pressed && styles.linkPressed}
        >
          <AppText variant="label" tone="accent">
            {linkLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: "center",
  },
  body: {
    marginTop: spacing.sm,
    maxWidth: 280,
    textAlign: "center",
    color: colors.text,
  },
  action: {
    width: "100%",
    maxWidth: 280,
    marginTop: spacing.lg,
  },
  linkPressed: {
    opacity: 0.7,
  },
});

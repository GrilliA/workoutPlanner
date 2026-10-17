import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { abandonSession, getSessions, startSession, type AthleteHome } from "../../../api";
import { ApiError } from "../../../api/client";
import { useAuth } from "../../../auth";
import {
  AppText,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Meta,
  Screen,
  Title,
  useTabBarInset,
  type MascotName,
} from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { formatInitials } from "../../../utils/initials";
import { toRomeDateKey } from "../../../utils/romeCalendar";
import { ChangeWorkoutSheet } from "../changeworkoutsheet";
import {
  formatGreeting,
  formatLastSession,
  formatLongDate,
  formatNextWorkout,
  formatSessionsLast7Days,
} from "../mappers/homeLabels";
import {
  buildWorkoutChoices,
  describeSelection,
  hasAnyWorkoutDay,
  resolveSelection,
  weekWorkoutId,
} from "../mappers/homeSelection";
import { mapHomeWeek } from "../mappers/mapWeekStrip";
import { RecentRow } from "../recentrow";
import { RestDayCard, TodayCard } from "../todaycard";
import type { WeekStripDay, WorkoutSelection } from "../types";
import { useHomeData } from "../useHomeData";
import { WeekStrip } from "../weekstrip";

type NoProgramReason = NonNullable<AthleteHome["noProgramReason"]>;

type NoProgramCopy = {
  mascot?: MascotName;
  title: string;
  body: string;
  actionLabel: string;
  linkLabel?: string;
};

const NO_PROGRAM_COPY: Record<NoProgramReason, NoProgramCopy> = {
  "no-coach": {
    title: "Ancora nessuna scheda",
    body: "Collega il tuo coach con il codice invito oppure creane una tu.",
    actionLabel: "Collega coach",
    linkLabel: "Crea una scheda da solo",
  },
  "coach-pending": {
    mascot: "waiting",
    title: "Il tuo coach ci sta lavorando",
    body: "Appena ti assegna una scheda la trovi qui.",
    actionLabel: "Crea una scheda tua",
  },
  "coach-program-inactive": {
    mascot: "waiting",
    title: "La scheda del coach è in pausa",
    body: "Non è attiva in questo momento. Scrivi al tuo coach se pensi sia un errore.",
    actionLabel: "Crea una scheda tua",
  },
};

/** La scelta dell'atleta: dal bottom sheet (senza data) o da un giorno della settimana. */
type ChosenDay = {
  selection: WorkoutSelection;
  dateKey: string | null;
};

type HomeScreenProps = {
  /** Riga della sessione salvata sul telefono (feature session, montata dalla route). */
  offlineSessionBanner?: React.ReactNode;
};

/** Home atleta "Sole": cosa c'è oggi e un solo bottone per iniziare. */
export function HomeScreen({ offlineSessionBanner }: HomeScreenProps) {
  const { user } = useAuth();
  const tabBarInset = useTabBarInset();
  const { home, loading, refreshing, error, refresh, retry } = useHomeData();
  const [chosen, setChosen] = useState<ChosenDay | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (loading && !home) {
    return <LoadingBlock />;
  }

  const todayKey = toRomeDateKey(new Date());

  const onConfirmChoice = (selection: WorkoutSelection) => {
    setChosen({ selection, dateKey: null });
    setIsSheetOpen(false);
  };

  const onWeekDayPress = (day: WeekStripDay) => {
    const workoutId = home ? weekWorkoutId(home) : null;
    if (workoutId === null || day.workoutDayId === null) {
      return;
    }
    setChosen({
      selection: { workoutId, workoutDayId: day.workoutDayId },
      dateKey: day.dateKey,
    });
  };

  const onStart = (selection: WorkoutSelection) => {
    setStartError(null);
    setIsStarting(true);
    void startWorkout(selection)
      .catch((err: unknown) => {
        setStartError(ApiError.messageFrom(err, "Impossibile avviare"));
      })
      .finally(() => {
        setIsStarting(false);
      });
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accentText}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Title numberOfLines={1}>{formatGreeting(user?.name)}</Title>
            <Meta style={styles.date}>{formatLongDate(todayKey)}</Meta>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.push("/(app)/settings")}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          >
            <AppText tone="accent" style={styles.avatarLabel}>
              {formatInitials(user?.name)}
            </AppText>
          </Pressable>
        </View>

        {error ? <ErrorBanner message={error} onRetry={retry} /> : null}
        {startError ? <ErrorBanner message={startError} /> : null}
        {offlineSessionBanner}

        {home ? (
          <HomeBody
            home={home}
            todayKey={todayKey}
            chosen={chosen}
            isStarting={isStarting}
            onStart={onStart}
            onOpenSheet={() => setIsSheetOpen(true)}
            onWeekDayPress={onWeekDayPress}
          />
        ) : null}
      </ScrollView>

      {home ? (
        <ChangeWorkoutSheet
          visible={isSheetOpen}
          sections={buildWorkoutChoices(home.programs)}
          selection={resolveSelection(home, chosen?.selection ?? null)}
          onConfirm={onConfirmChoice}
          onClose={() => setIsSheetOpen(false)}
        />
      ) : null}
    </Screen>
  );
}

type HomeBodyProps = {
  home: AthleteHome;
  todayKey: string;
  chosen: ChosenDay | null;
  isStarting: boolean;
  onStart: (selection: WorkoutSelection) => void;
  onOpenSheet: () => void;
  onWeekDayPress: (day: WeekStripDay) => void;
};

function HomeBody({
  home,
  todayKey,
  chosen,
  isStarting,
  onStart,
  onOpenSheet,
  onWeekDayPress,
}: HomeBodyProps) {
  if (home.programs.length === 0) {
    // Motivo assente = caricamento fallito: lo dice già il banner d'errore.
    if (!home.noProgramReason) {
      return null;
    }
    return <NoProgramState reason={home.noProgramReason} />;
  }

  if (!hasAnyWorkoutDay(home.programs)) {
    return (
      <EmptyState
        mascot="notebook"
        title="La scheda non ha ancora giorni"
        body="Aggiungi un giorno di allenamento per iniziare."
        actionLabel="Vai alle schede"
        onAction={() => router.push("/(app)/workouts")}
      />
    );
  }

  const selection = resolveSelection(home, chosen?.selection ?? null);
  const selectedWorkout = selection ? describeSelection(home, selection) : null;
  const isChosenSelection = chosen !== null && selection === chosen.selection;
  const selectedDateKey = isChosenSelection ? chosen.dateKey : null;
  const nextWorkoutLabel = home.nextWorkout
    ? formatNextWorkout(home.nextWorkout, todayKey)
    : null;
  const lastSession = home.lastSession ? formatLastSession(home.lastSession) : null;
  const lastSessionId = home.lastSession?.sessionId ?? null;
  const openLastSession =
    lastSessionId === null ? undefined : () => router.push(`/session/${lastSessionId}`);

  return (
    <>
      <WeekStrip
        days={mapHomeWeek(home.week, todayKey)}
        selectedDateKey={selectedDateKey}
        onDayPress={onWeekDayPress}
      />

      {selection && selectedWorkout ? (
        <TodayCard
          workout={selectedWorkout}
          isStarting={isStarting}
          onStart={() => onStart(selection)}
          onChange={onOpenSheet}
        />
      ) : (
        <RestDayCard nextWorkoutLabel={nextWorkoutLabel} onTrainAnyway={onOpenSheet} />
      )}

      <View style={styles.tiles}>
        <View style={styles.weekTile}>
          <AppText style={styles.weekCount}>{home.sessionsLast7Days}</AppText>
          <AppText style={styles.weekLabel}>
            {formatSessionsLast7Days(home.sessionsLast7Days)}
          </AppText>
        </View>
        <RecentRow session={lastSession} onPress={openLastSession} />
      </View>
    </>
  );
}

function NoProgramState({ reason }: { reason: NoProgramReason }) {
  const copy = NO_PROGRAM_COPY[reason];
  const isNoCoach = reason === "no-coach";
  const openNewWorkout = () => router.push("/workout/new");
  const openCoach = () => router.push("/(app)/settings/coach");
  const onAction = isNoCoach ? openCoach : openNewWorkout;
  const onLink = copy.linkLabel ? openNewWorkout : undefined;

  return (
    <EmptyState
      mascot={copy.mascot}
      title={copy.title}
      body={copy.body}
      actionLabel={copy.actionLabel}
      onAction={onAction}
      linkLabel={copy.linkLabel}
      onLink={onLink}
    />
  );
}

/**
 * Avvia la sessione. Con una sessione già aperta (409) chiede se riprenderla
 * o abbandonarla e avviarne una nuova.
 */
async function startWorkout(selection: WorkoutSelection): Promise<void> {
  try {
    await openNewSession(selection);
  } catch (err) {
    const isSessionOpen = err instanceof ApiError && err.status === 409;
    if (!isSessionOpen) {
      throw err;
    }
    const sessions = await getSessions();
    const openSession = sessions.find((session) => session.status === "in_progress");
    if (!openSession) {
      throw err;
    }
    askResumeOrRestart(openSession.id, selection);
  }
}

async function openNewSession(selection: WorkoutSelection): Promise<void> {
  const session = await startSession(selection.workoutId, {
    workoutDayId: selection.workoutDayId,
  });
  router.push(`/session/${session.id}`);
}

function askResumeOrRestart(openSessionId: number, selection: WorkoutSelection) {
  const abandonAndStart = async () => {
    try {
      await abandonSession(openSessionId);
      await openNewSession(selection);
    } catch (err) {
      Alert.alert("Impossibile avviare", ApiError.messageFrom(err, "Riprova tra poco."));
    }
  };

  Alert.alert(
    "Sessione già in corso",
    "Hai una sessione non terminata. Vuoi riprenderla o abbandonarla per iniziarne una nuova?",
    [
      { text: "Riprendi", onPress: () => router.push(`/session/${openSessionId}`) },
      {
        text: "Abbandona e avvia",
        style: "destructive",
        onPress: () => {
          void abandonAndStart();
        },
      },
      { text: "Annulla", style: "cancel" },
    ],
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  date: {
    fontSize: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.7,
  },
  tiles: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  weekTile: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.dataBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 2,
  },
  weekCount: {
    color: colors.data,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  weekLabel: {
    color: colors.data,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
});

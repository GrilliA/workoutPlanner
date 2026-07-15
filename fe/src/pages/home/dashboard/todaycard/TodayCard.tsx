import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@components/button";
import { Skeleton } from "@components/skeleton";
import { resolveWorkoutSessionId } from "@pages/sessions/active/api";
import { DayPicker } from "../daypicker";
import type { TodaySchedule, TodayWorkout } from "../types";
import { useScheduleOverride } from "../useScheduleOverride";
import "./style.css";

export type TodayCardProps = {
  workout: TodayWorkout | null;
  schedule: TodaySchedule | null;
  isLoading?: boolean;
  onScheduleChanged: () => void;
};

function TodayCardSkeleton() {
  return (
    <section
      className="today-card loading"
      aria-labelledby="today-card-title"
      aria-busy="true"
    >
      <div className="header">
        <span className="eyebrow">OGGI</span>
        <Skeleton variant="text" width="55%" height={28} />
      </div>

      <Skeleton variant="text" width="80%" />
      <div className="meta">
        <Skeleton variant="block" width={120} height={28} className="chip-skeleton" />
        <Skeleton variant="block" width={72} height={28} className="chip-skeleton" />
      </div>

      <Skeleton variant="block" height={44} className="cta-skeleton" />
    </section>
  );
};

type TodayCardScheduleActionsProps = {
  schedule: TodaySchedule;
  currentDayId: number | null;
  isSaving: boolean;
  scheduleError: string | null;
  onOpenPicker: () => void;
};

function TodayCardScheduleActions({
  schedule,
  currentDayId,
  isSaving,
  scheduleError,
  onOpenPicker,
}: TodayCardScheduleActionsProps) {
  const canChangeDay = schedule.programDays.length > 0;

  if (!canChangeDay) {
    return null;
  }

  return (
    <div className="schedule-actions">
      {schedule.source === "override" ? (
        <span className="chip override">Modificato manualmente</span>
      ) : null}

      <div className="action-row">
        <Button.Root
          variant="secondary"
          size="sm"
          disabled={isSaving}
          onClick={onOpenPicker}
        >
          <Button.Label>{currentDayId ? "CAMBIA GIORNO" : "SCEGLI ALLENAMENTO"}</Button.Label>
        </Button.Root>
      </div>

      {scheduleError ? (
        <p className="schedule-error" role="alert">
          {scheduleError}
        </p>
      ) : null}
    </div>
  );
}

type TodayCardEmptyProps = {
  schedule: TodaySchedule | null;
  isSaving: boolean;
  scheduleError: string | null;
  onOpenPicker: () => void;
};

function TodayCardEmpty({
  schedule,
  isSaving,
  scheduleError,
  onOpenPicker,
}: TodayCardEmptyProps) {
  const hasProgramDays = (schedule?.programDays.length ?? 0) > 0;

  return (
    <section className="today-card empty" aria-labelledby="today-card-title">
      <div className="header">
        <span className="eyebrow">OGGI</span>
        <h2 id="today-card-title" className="title">
          Nessun allenamento oggi
        </h2>
        {schedule ? <p className="program">{schedule.programName}</p> : null}
      </div>

      <p className="empty-message" aria-live="polite">
        Giorno di riposo o nessuna scheda programmata per oggi
      </p>

      {schedule ? (
        <TodayCardScheduleActions
          schedule={schedule}
          currentDayId={null}
          isSaving={isSaving}
          scheduleError={scheduleError}
          onOpenPicker={onOpenPicker}
        />
      ) : null}

      {!hasProgramDays ? (
        <Link href="/workouts/new" className="cta-link">
          <Button.Root variant="secondary" className="cta">
            <Button.Label>CREA WORKOUT</Button.Label>
          </Button.Root>
        </Link>
      ) : null}
    </section>
  );
}

export function TodayCard({
  workout,
  schedule,
  isLoading = false,
  onScheduleChanged,
}: TodayCardProps) {
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { isSaving, error: scheduleError, setDayOverride, clearDayOverride } =
    useScheduleOverride(onScheduleChanged);

  if (isLoading) {
    return <TodayCardSkeleton />;
  }

  const handleSelectDay = async (workoutDayId: number) => {
    if (!schedule) {
      return;
    }

    try {
      await setDayOverride(schedule.workoutId, schedule.dateKey, workoutDayId);
      setIsPickerOpen(false);
    } catch {
      // error surfaced via hook state
    }
  };

  const handleResetOverride = async () => {
    if (!schedule) {
      return;
    }

    try {
      await clearDayOverride(schedule.workoutId, schedule.dateKey);
      setIsPickerOpen(false);
    } catch {
      // error surfaced via hook state
    }
  };

  if (!workout) {
    return (
      <>
        <TodayCardEmpty
          schedule={schedule}
          isSaving={isSaving}
          scheduleError={scheduleError}
          onOpenPicker={() => setIsPickerOpen(true)}
        />
        {schedule ? (
          <DayPicker
            isOpen={isPickerOpen}
            days={schedule.programDays}
            currentDayId={null}
            title="Scegli il giorno di oggi"
            currentLabel="Oggi"
            isSaving={isSaving}
            showReset={schedule.source === "override"}
            onClose={() => setIsPickerOpen(false)}
            onSelect={(workoutDayId) => void handleSelectDay(workoutDayId)}
            onReset={() => void handleResetOverride()}
          />
        ) : null}
      </>
    );
  }

  const { workoutId, workoutDayId, name, programName, exercises, goal, durationMin } = workout;

  const handleStart = async () => {
    setIsStarting(true);
    setStartError(null);

    try {
      const sessionId = await resolveWorkoutSessionId(workoutId, workoutDayId);
      setLocation(`/sessions/${sessionId}`);
    } catch {
      setStartError("Impossibile avviare l'allenamento");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <section className="today-card" aria-labelledby="today-card-title">
        <div className="header">
          <span className="eyebrow">OGGI</span>
          <h2 id="today-card-title" className="title">
            {name}
          </h2>
          <p className="program">{programName}</p>
        </div>

        <p className="exercises">{exercises.join(" · ")}</p>

        <div className="meta">
          <span className="chip">{goal}</span>
          {durationMin > 0 ? <span className="chip">{durationMin} min</span> : null}
        </div>

        {schedule ? (
          <TodayCardScheduleActions
            schedule={schedule}
            currentDayId={workoutDayId}
            isSaving={isSaving}
            scheduleError={scheduleError}
            onOpenPicker={() => setIsPickerOpen(true)}
          />
        ) : null}

        {startError ? (
          <p className="start-error" role="alert">
            {startError}
          </p>
        ) : null}

        <Button.Root
          variant="primary"
          className="cta"
          loading={isStarting}
          disabled={isStarting || isSaving}
          onClick={() => void handleStart()}
        >
          <Button.Label>AVVIA WORKOUT</Button.Label>
        </Button.Root>
      </section>

      {schedule ? (
        <DayPicker
          isOpen={isPickerOpen}
          days={schedule.programDays}
          currentDayId={workoutDayId}
          title="Scegli il giorno di oggi"
          currentLabel="Oggi"
          isSaving={isSaving}
          showReset={schedule.source === "override"}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(dayId) => void handleSelectDay(dayId)}
          onReset={() => void handleResetOverride()}
        />
      ) : null}
    </>
  );
}

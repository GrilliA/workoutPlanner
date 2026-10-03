const ROME_TIME_ZONE = "Europe/Rome";

export const WEEKDAY_LABELS_IT = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const isWeekday = (value: number): value is Weekday =>
  Number.isInteger(value) && value >= 0 && value <= 6;

export const toRomeDateKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: ROME_TIME_ZONE });

/** 0 = Monday … 6 = Sunday */
export const getRomeWeekday = (date: Date): Weekday => {
  const weekdayLabel = date.toLocaleDateString("en-US", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
  });

  const map: Record<string, Weekday> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const weekday = map[weekdayLabel];

  if (weekday === undefined) {
    throw new Error(`Unable to resolve weekday for ${weekdayLabel}`);
  }

  return weekday;
};

export const parseScheduledDate = (value: unknown): string | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
};

export const addDaysToDateKey = (dateKey: string, days: number): string =>
  new Date(new Date(`${dateKey}T12:00:00Z`).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);

export type ResolvedWorkoutDay = {
  workoutDayId: number;
  workoutDayName: string;
  source: "override" | "schedule" | "default";
};

export type PickWorkoutDayInput = {
  dateKey: string;
  weekday: Weekday;
  overrides: {
    scheduledDate: string;
    workoutDayId: number;
    workoutDayName: string;
  }[];
  weekdayDays: {
    weekday: number;
    workoutDayId: number;
    workoutDayName: string;
    sortOrder: number;
  }[];
  days: { id: number; name: string }[];
};

export const pickWorkoutDayForDate = (
  input: PickWorkoutDayInput,
): ResolvedWorkoutDay | null => {
  const override = input.overrides.find(
    (entry) => entry.scheduledDate === input.dateKey,
  );

  if (override) {
    return {
      workoutDayId: override.workoutDayId,
      workoutDayName: override.workoutDayName,
      source: "override",
    };
  }

  const scheduled = input.weekdayDays
    .filter((entry) => entry.weekday === input.weekday)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.workoutDayId - b.workoutDayId)[0];

  if (!scheduled) {
    if (input.days.length === 1) {
      return {
        workoutDayId: input.days[0].id,
        workoutDayName: input.days[0].name,
        source: "default",
      };
    }

    return null;
  }

  return {
    workoutDayId: scheduled.workoutDayId,
    workoutDayName: scheduled.workoutDayName,
    source: "schedule",
  };
};

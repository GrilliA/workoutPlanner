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

const ROME_TIME_ZONE = "Europe/Rome";

export const WEEKDAY_LABELS_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] as const;

export type RomeWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const toRomeDateKey = (date: Date): string =>
  date.toLocaleDateString("en-CA", { timeZone: ROME_TIME_ZONE });

export const getRomeWeekday = (date: Date): RomeWeekday => {
  const weekdayLabel = date.toLocaleDateString("en-US", {
    timeZone: ROME_TIME_ZONE,
    weekday: "short",
  });

  const map: Record<string, RomeWeekday> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return map[weekdayLabel] ?? 0;
};

// A `YYYY-MM-DD` key is a calendar day, not an instant: it is read and formatted in UTC,
// so the browser time zone can never move it to the day before.
const dateKeyToUtc = (dateKey: string): Date => new Date(`${dateKey}T00:00:00Z`);

export const addRomeDays = (dateKey: string, days: number): string => {
  const utcDate = dateKeyToUtc(dateKey);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return utcDate.toISOString().slice(0, 10);
};

export const buildRomeWeekDateKeys = (reference = new Date()): string[] => {
  const todayKey = toRomeDateKey(reference);
  const weekday = getRomeWeekday(reference);
  const mondayKey = addRomeDays(todayKey, -weekday);

  return Array.from({ length: 7 }, (_, index) => addRomeDays(mondayKey, index));
};

export const getDayNumberFromDateKey = (dateKey: string): number => Number(dateKey.slice(8, 10));

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EARLIEST_DATE_KEY = "2000-01-01";
const LATEST_DATE_KEY = "2099-12-31";
const MILLISECONDS_PER_DAY = 86_400_000;

/** Today in Europe/Rome, the "today" of the API. */
export const todayInRome = (): string => toRomeDateKey(new Date());

/** A real calendar day between 2000 and 2099, the range the API accepts. */
export const isValidDateKey = (value: string): boolean => {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  // "2026-02-30" is a valid Date (2 March): the day is real only if it formats back unchanged.
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDay =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDay && value >= EARLIEST_DATE_KEY && value <= LATEST_DATE_KEY;
};

/** Days from `from` to `to`, negative when `to` comes first. */
export const daysBetweenDateKeys = (from: string, to: string): number =>
  Math.round((dateKeyToUtc(to).getTime() - dateKeyToUtc(from).getTime()) / MILLISECONDS_PER_DAY);

const longDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const shortDateWithYearFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-28" → "28 ottobre 2026". */
export const formatLongDate = (dateKey: string): string =>
  longDateFormatter.format(dateKeyToUtc(dateKey));

/** "29 set" in the current year, "29 set 2025" otherwise. */
export const formatShortDate = (dateKey: string, today: string): string => {
  const isThisYear = dateKey.slice(0, 4) === today.slice(0, 4);
  const formatter = isThisYear ? shortDateFormatter : shortDateWithYearFormatter;

  return formatter.format(dateKeyToUtc(dateKey));
};

/**
 * Whether the Italian word for a number starts with a vowel: "uno", "otto", "undici",
 * "ottanta…", "ottocento…". Articles and prepositions elide before it ("l'8", "gli 11").
 */
export const isNumberSpokenWithVowel = (number: number): boolean => {
  const isEightyToEightyNine = number >= 80 && number <= 89;
  const isEightHundreds = number >= 800 && number <= 899;

  return number === 1 || number === 8 || number === 11 || isEightyToEightyNine || isEightHundreds;
};

type DatePreposition = "il" | "al" | "dal" | "del";

const ELIDED_PREPOSITIONS: Record<DatePreposition, string> = {
  il: "l'",
  al: "all'",
  dal: "dall'",
  del: "dell'",
};

/**
 * "al 2 novembre 2026", "all'11 novembre 2026", "l'8 novembre 2026". `formatDate` swaps the long
 * date for another one that starts with the day, such as `formatShortDate` ("all'8 nov").
 */
export const withDatePreposition = (
  preposition: DatePreposition,
  dateKey: string,
  formatDate: (dateKey: string) => string = formatLongDate,
): string => {
  const date = formatDate(dateKey);
  const day = Number(dateKey.slice(8, 10));

  if (isNumberSpokenWithVowel(day)) {
    return `${ELIDED_PREPOSITIONS[preposition]}${date}`;
  }

  return `${preposition} ${date}`;
};

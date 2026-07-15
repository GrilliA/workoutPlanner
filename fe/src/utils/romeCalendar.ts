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

export const addRomeDays = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
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

export type WeekStripDay = {
  dateKey: string;
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
  workoutDayId: number | null;
  workoutDayName: string | null;
  isRest: boolean;
};

export type HomeStat = {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: string;
};

export type HomeRecentSession = {
  id: number;
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
  volumeLabel: string;
};

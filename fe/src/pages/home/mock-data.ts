export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  unit: string;
  trend: string;
};

export type RecentWorkout = {
  id: number;
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
};

export const dashboardMock = {
  userName: "Marco",
  todayWorkout: {
    name: "Push Day",
    exercises: ["Panca piana", "Military press", "French press"],
    goal: "Ipertrofia · RIR 2",
    durationMin: 65,
  },
  stats: [
    { id: "volume", label: "Volume", value: "12.4k", unit: "kg", trend: "+8%" },
    { id: "workout", label: "Workout", value: "4", unit: "/sett", trend: "+1" },
    { id: "streak", label: "Streak", value: "12", unit: "giorni", trend: "record" },
    { id: "record", label: "Record", value: "140", unit: "kg", trend: "panca" },
  ] satisfies DashboardStat[],
  recentWorkouts: [
    {
      id: 1,
      name: "Leg Day",
      dateLabel: "22 Giu",
      durationMin: 58,
      volumeKg: 9840,
    },
    {
      id: 2,
      name: "Pull Day",
      dateLabel: "20 Giu",
      durationMin: 62,
      volumeKg: 10250,
    },
    {
      id: 3,
      name: "Push Day",
      dateLabel: "18 Giu",
      durationMin: 55,
      volumeKg: 9100,
    },
  ] satisfies RecentWorkout[],
};

import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db, closeDb } from "../db";
import {
  coachAthletes,
  exerciseSets,
  exercises,
  loggedSets,
  programAssignments,
  users,
  workoutDays,
  workoutDayWeekdays,
  workoutSessions,
  workouts,
} from "../db/schema";
import { hashPassword } from "../services/password";
import { assignFromTemplate } from "../services/programAssignment";
import { todayInRome } from "../services/assignmentStatus";
import { getRomeWeekday } from "../services/workoutSchedule";
import {
  saveWorkoutProgram,
  type WorkoutProgramInput,
} from "../services/workoutProgram";

const COACH_EMAIL = "alessiogrilli@outlook.com";
const ATHLETE_PASSWORD = "TracciaDemo1";
const EXISTING_ATHLETE_EMAIL = "alessiogrilli2024@gmail.com";

const sets = (
  reps: number,
  count: number,
  restSec: number,
): WorkoutProgramInput["days"][number]["exercises"][number]["setPrescriptions"] =>
  Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    reps,
    restSec,
  }));

const pplProgram = (): WorkoutProgramInput => ({
  name: "PPL palestra 3×",
  defaultRestSec: 90,
  workoutType: "Ipertrofia",
  frequency: "3× a settimana",
  days: [
    {
      name: "Push",
      sortOrder: 0,
      weekdays: [0],
      exercises: [
        {
          name: "Panca piana",
          catalogId: "Barbell_Bench_Press_-_Medium_Grip",
          setPrescriptions: sets(8, 4, 120),
        },
        {
          name: "Panca inclinata manubri",
          catalogId: "Incline_Dumbbell_Press",
          setPrescriptions: sets(10, 3, 90),
        },
        {
          name: "Military press",
          catalogId: "Standing_Military_Press",
          setPrescriptions: sets(8, 3, 120),
        },
        {
          name: "Pushdown tricipiti",
          catalogId: "Triceps_Pushdown",
          setPrescriptions: sets(12, 3, 60),
        },
      ],
    },
    {
      name: "Pull",
      sortOrder: 1,
      weekdays: [2],
      exercises: [
        {
          name: "Stacco rumeno",
          catalogId: "Romanian_Deadlift",
          setPrescriptions: sets(8, 3, 150),
        },
        {
          name: "Rematore bilanciere",
          catalogId: "Bent_Over_Barbell_Row",
          setPrescriptions: sets(8, 4, 90),
        },
        {
          name: "Trazioni",
          catalogId: "Pullups",
          setPrescriptions: sets(6, 4, 120),
        },
        {
          name: "Face pull",
          catalogId: "Face_Pull",
          setPrescriptions: sets(15, 3, 60),
        },
        {
          name: "Curl bilanciere",
          catalogId: "Barbell_Curl",
          setPrescriptions: sets(10, 3, 60),
        },
      ],
    },
    {
      name: "Legs",
      sortOrder: 2,
      weekdays: [4],
      exercises: [
        {
          name: "Squat",
          catalogId: "Barbell_Full_Squat",
          setPrescriptions: sets(6, 4, 150),
        },
        {
          name: "Leg press",
          catalogId: "Leg_Press",
          setPrescriptions: sets(12, 3, 90),
        },
        {
          name: "Affondi manubri",
          catalogId: "Dumbbell_Lunges",
          setPrescriptions: sets(10, 3, 90),
        },
        {
          name: "Alzate polpacci",
          catalogId: "Standing_Calf_Raises",
          setPrescriptions: sets(15, 4, 60),
        },
      ],
    },
  ],
});

const upperLowerProgram = (): WorkoutProgramInput => ({
  name: "Upper Lower forza",
  defaultRestSec: 150,
  workoutType: "Forza",
  frequency: "4× a settimana",
  days: [
    {
      name: "Lower A",
      sortOrder: 0,
      weekdays: [0],
      exercises: [
        { name: "Squat", catalogId: "Barbell_Full_Squat", setPrescriptions: sets(5, 5, 150) },
        {
          name: "Stacco rumeno",
          catalogId: "Romanian_Deadlift",
          setPrescriptions: sets(5, 3, 150),
        },
        {
          name: "Leg curl",
          catalogId: "Seated_Leg_Curl",
          setPrescriptions: sets(10, 3, 90),
        },
      ],
    },
    {
      name: "Upper A",
      sortOrder: 1,
      weekdays: [1],
      exercises: [
        {
          name: "Panca piana",
          catalogId: "Barbell_Bench_Press_-_Medium_Grip",
          setPrescriptions: sets(5, 5, 150),
        },
        {
          name: "Rematore bilanciere",
          catalogId: "Bent_Over_Barbell_Row",
          setPrescriptions: sets(6, 4, 120),
        },
        {
          name: "Military press",
          catalogId: "Standing_Military_Press",
          setPrescriptions: sets(5, 3, 150),
        },
      ],
    },
    {
      name: "Lower B",
      sortOrder: 2,
      weekdays: [3],
      exercises: [
        {
          name: "Stacco da terra",
          catalogId: "Barbell_Deadlift",
          setPrescriptions: sets(5, 3, 150),
        },
        { name: "Leg press", catalogId: "Leg_Press", setPrescriptions: sets(8, 4, 120) },
        {
          name: "Alzate polpacci",
          catalogId: "Standing_Calf_Raises",
          setPrescriptions: sets(12, 4, 60),
        },
      ],
    },
    {
      name: "Upper B",
      sortOrder: 3,
      weekdays: [4],
      exercises: [
        {
          name: "Panca inclinata",
          catalogId: "Barbell_Incline_Bench_Press_-_Medium_Grip",
          setPrescriptions: sets(6, 4, 150),
        },
        { name: "Trazioni", catalogId: "Pullups", setPrescriptions: sets(6, 4, 120) },
        {
          name: "Alzate laterali",
          catalogId: "Side_Lateral_Raise",
          setPrescriptions: sets(12, 3, 60),
        },
      ],
    },
  ],
});

const fullBodyProgram = (): WorkoutProgramInput => ({
  name: "Full body 2×",
  defaultRestSec: 120,
  workoutType: "Forza + Ipertrofia",
  frequency: "2× a settimana",
  days: [
    {
      name: "A",
      sortOrder: 0,
      weekdays: [0, 5],
      exercises: [
        { name: "Goblet squat", catalogId: "Goblet_Squat", setPrescriptions: sets(10, 3, 120) },
        {
          name: "Panca manubri",
          catalogId: "Dumbbell_Bench_Press",
          setPrescriptions: sets(10, 3, 120),
        },
        {
          name: "Rematore manubrio",
          catalogId: "One-Arm_Dumbbell_Row",
          setPrescriptions: sets(10, 3, 90),
        },
        {
          name: "Curl bilanciere",
          catalogId: "Barbell_Curl",
          setPrescriptions: sets(12, 3, 60),
        },
      ],
    },
    {
      name: "B",
      sortOrder: 1,
      weekdays: [3],
      exercises: [
        {
          name: "Affondi manubri",
          catalogId: "Dumbbell_Lunges",
          setPrescriptions: sets(10, 3, 120),
        },
        {
          name: "Military press",
          catalogId: "Standing_Military_Press",
          setPrescriptions: sets(8, 3, 120),
        },
        { name: "Lat machine", catalogId: "Wide-Grip_Lat_Pulldown", setPrescriptions: sets(10, 3, 90) },
        { name: "Hammer curl", catalogId: "Hammer_Curls", setPrescriptions: sets(12, 3, 60) },
      ],
    },
  ],
});

type Sex = "m" | "f";

type AthletePlan = {
  email: string;
  name: string;
  sex: Sex;
  strength: number;
  joinedAt: string;
  templateName: string;
  startsAt: string;
  expiresAt: string;
  lastSessionOn: string | null;
  skipRate: number;
  extra?: { templateName: string; startsAt: string; expiresAt: string };
};

const ATHLETES: AthletePlan[] = [
  {
    email: EXISTING_ATHLETE_EMAIL,
    name: "Alessio Grilli",
    sex: "m",
    strength: 1.05,
    joinedAt: "2026-07-27",
    templateName: "Ipertrofia 5 Giorni",
    startsAt: "2026-07-28",
    expiresAt: "2026-10-20",
    lastSessionOn: "2026-09-12",
    skipRate: 0.12,
  },
  {
    email: "marco.esposito.traccia@example.com",
    name: "Marco Esposito",
    sex: "m",
    strength: 1.18,
    joinedAt: "2026-07-02",
    templateName: "Upper Lower forza",
    startsAt: "2026-07-06",
    expiresAt: "2026-11-01",
    lastSessionOn: "2026-09-11",
    skipRate: 0.08,
  },
  {
    email: "giulia.romano.traccia@example.com",
    name: "Giulia Romano",
    sex: "f",
    strength: 1.02,
    joinedAt: "2026-08-01",
    templateName: "PPL palestra 3×",
    startsAt: "2026-08-03",
    expiresAt: "2026-09-15",
    lastSessionOn: "2026-09-10",
    skipRate: 0.1,
  },
  {
    email: "luca.bianchi.traccia@example.com",
    name: "Luca Bianchi",
    sex: "m",
    strength: 0.92,
    joinedAt: "2026-06-20",
    templateName: "PPL palestra 3×",
    startsAt: "2026-06-22",
    expiresAt: "2026-10-01",
    lastSessionOn: "2026-08-30",
    skipRate: 0.2,
  },
  {
    email: "sara.greco.traccia@example.com",
    name: "Sara Greco",
    sex: "f",
    strength: 0.98,
    joinedAt: "2026-06-18",
    templateName: "Ipertrofia 5 Giorni",
    startsAt: "2026-06-22",
    expiresAt: "2026-09-16",
    lastSessionOn: "2026-09-09",
    skipRate: 0.15,
  },
  {
    email: "andrea.moretti.traccia@example.com",
    name: "Andrea Moretti",
    sex: "m",
    strength: 1,
    joinedAt: "2026-09-08",
    templateName: "PPL palestra 3×",
    startsAt: "2026-09-22",
    expiresAt: "2026-12-20",
    lastSessionOn: null,
    skipRate: 1,
  },
  {
    email: "chiara.fontana.traccia@example.com",
    name: "Chiara Fontana",
    sex: "f",
    strength: 0.88,
    joinedAt: "2026-09-01",
    templateName: "Full body 2×",
    startsAt: "2026-09-01",
    expiresAt: "2026-11-15",
    lastSessionOn: null,
    skipRate: 1,
  },
  {
    email: "davide.rizzo.traccia@example.com",
    name: "Davide Rizzo",
    sex: "m",
    strength: 1.12,
    joinedAt: "2026-06-28",
    templateName: "Ipertrofia 5 Giorni",
    startsAt: "2026-07-01",
    expiresAt: "2026-10-31",
    lastSessionOn: "2026-09-12",
    skipRate: 0.06,
  },
  {
    email: "elena.marino.traccia@example.com",
    name: "Elena Marino",
    sex: "f",
    strength: 1.08,
    joinedAt: "2026-08-10",
    templateName: "Full body 2×",
    startsAt: "2026-08-11",
    expiresAt: "2026-10-15",
    lastSessionOn: "2026-09-12",
    skipRate: 0.05,
  },
  {
    email: "paolo.conti.traccia@example.com",
    name: "Paolo Conti",
    sex: "m",
    strength: 0.96,
    joinedAt: "2026-05-12",
    templateName: "PPL palestra 3×",
    startsAt: "2026-05-18",
    expiresAt: "2026-09-05",
    lastSessionOn: "2026-08-28",
    skipRate: 0.18,
  },
  {
    email: "martina.deluca.traccia@example.com",
    name: "Martina De Luca",
    sex: "f",
    strength: 0.94,
    joinedAt: "2026-05-20",
    templateName: "Full body 2×",
    startsAt: "2026-05-25",
    expiresAt: "2026-08-30",
    lastSessionOn: "2026-08-27",
    skipRate: 0.16,
    extra: {
      templateName: "PPL palestra 3×",
      startsAt: "2026-09-22",
      expiresAt: "2026-12-15",
    },
  },
  {
    email: "federico.neri.traccia@example.com",
    name: "Federico Neri",
    sex: "m",
    strength: 1.04,
    joinedAt: "2026-07-08",
    templateName: "Upper Lower forza",
    startsAt: "2026-07-13",
    expiresAt: "2026-10-15",
    lastSessionOn: "2026-08-28",
    skipRate: 0.14,
  },
];

const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const eachDate = (from: string, to: string): string[] => {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
};

const romeDateTime = (isoDate: string, hour: number, minute: number): Date => {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${isoDate}T${hh}:${mm}:00+02:00`);
};

const roundKg = (value: number): number => Math.round(value * 2) / 2;

const baseMaleKg = (name: string): number | null => {
  const n = name.toLowerCase();
  if (n.includes("trazioni")) return null;
  if (n.includes("stacco da terra")) return 145;
  if (n.includes("rumeno") || n.includes("deadlift")) return 105;
  if (n.includes("squat") && n.includes("goblet")) return 28;
  if (n.includes("squat")) return 120;
  if (n.includes("leg press")) return 190;
  if (n.includes("panca piana") || n.includes("panca presa")) return 85;
  if (n.includes("panca inclinata") || n.includes("chest press")) return 32;
  if (n.includes("panca manubri")) return 32;
  if (n.includes("military") || n.includes("shoulder press")) return 50;
  if (n.includes("rematore")) return 70;
  if (n.includes("lat machine")) return 55;
  if (n.includes("leg extension")) return 48;
  if (n.includes("leg curl")) return 42;
  if (n.includes("polpacci") || n.includes("calf")) return 80;
  if (n.includes("affondi")) return 18;
  if (n.includes("croci") || n.includes("face pull")) return 16;
  if (n.includes("alzate laterali")) return 10;
  if (n.includes("reverse pec")) return 28;
  if (n.includes("french") || n.includes("pushdown") || n.includes("tricipiti")) return 22;
  if (n.includes("hammer") || n.includes("curl")) return 30;
  return 25;
};

const workingWeight = (
  name: string,
  sex: Sex,
  strength: number,
  weekIndex: number,
): number | null => {
  const base = baseMaleKg(name);
  if (base === null) return null;
  const sexFactor = sex === "m" ? 1 : name.toLowerCase().includes("alzate") ? 0.7 : 0.52;
  const progression = weekIndex * (base >= 80 ? 1.25 : 0.5);
  return roundKg(Math.max(2.5, base * sexFactor * strength + progression));
};

const sessionNotes = [
  "Sensazione buona, panca pulita.",
  "Ginocchio sinistro un po' fastidioso sugli squat.",
  "Ho dormito poco, carichi conservativi.",
  "PR percepito sullo stacco, tecnica ok.",
  "Spalle un po' infiammate, ho tagliato le laterali.",
  "Ottima sessione, recupero nei tempi.",
];

const ensureCoach = async () => {
  const [coach] = await db
    .select()
    .from(users)
    .where(eq(users.email, COACH_EMAIL))
    .limit(1);

  if (!coach || coach.role !== "coach") {
    throw new Error(`Coach ${COACH_EMAIL} not found`);
  }

  return coach;
};

const ensureTemplate = async (
  coachId: number,
  program: WorkoutProgramInput,
): Promise<number> => {
  const [existing] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, coachId),
        eq(workouts.kind, "template"),
        eq(workouts.name, program.name),
      ),
    )
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const saved = await saveWorkoutProgram(coachId, program, undefined, {
    kind: "template",
    createdByUserId: coachId,
    isActive: true,
  });

  if (!saved.ok) {
    throw new Error(`Template ${program.name}: ${saved.error}`);
  }

  return saved.workout.id;
};

const ensureAthlete = async (
  plan: AthletePlan,
  passwordHash: string,
): Promise<{ id: number; created: boolean }> => {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, plan.email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ name: plan.name, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    return { id: existing.id, created: false };
  }

  const [created] = await db
    .insert(users)
    .values({
      email: plan.email,
      passwordHash,
      name: plan.name,
      role: "athlete",
      createdAt: romeDateTime(plan.joinedAt, 9, 12),
      updatedAt: romeDateTime(plan.joinedAt, 9, 12),
    })
    .returning({ id: users.id });

  if (!created) {
    throw new Error(`Failed to create athlete ${plan.email}`);
  }

  return { id: created.id, created: true };
};

const ensureLink = async (coachId: number, athleteId: number, joinedAt: string) => {
  const [existing] = await db
    .select({ id: coachAthletes.id, coachId: coachAthletes.coachId })
    .from(coachAthletes)
    .where(eq(coachAthletes.athleteId, athleteId))
    .limit(1);

  if (existing) {
    if (existing.coachId !== coachId) {
      throw new Error(`Athlete ${athleteId} is already linked to another coach`);
    }
    return;
  }

  await db.insert(coachAthletes).values({
    coachId,
    athleteId,
    createdAt: romeDateTime(joinedAt, 9, 30),
  });
};

const ensureAssignment = async (
  coachId: number,
  athleteId: number,
  templateId: number,
  startsAt: string,
  expiresAt: string,
) => {
  const [existing] = await db
    .select({
      id: programAssignments.id,
      workoutId: programAssignments.workoutId,
    })
    .from(programAssignments)
    .innerJoin(workouts, eq(programAssignments.workoutId, workouts.id))
    .where(
      and(
        eq(programAssignments.coachId, coachId),
        eq(programAssignments.athleteId, athleteId),
        eq(workouts.sourceTemplateId, templateId),
        eq(programAssignments.startsAt, startsAt),
      ),
    )
    .limit(1);

  if (existing) {
    return existing.workoutId;
  }

  const assigned = await assignFromTemplate(coachId, athleteId, templateId, {
    startsAt,
    expiresAt,
  });

  if (!assigned.ok) {
    throw new Error(assigned.error);
  }

  return assigned.workout.id;
};

const loadProgramTree = async (workoutId: number) => {
  const days = await db
    .select()
    .from(workoutDays)
    .where(eq(workoutDays.workoutId, workoutId));
  const dayExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.workoutId, workoutId));
  const weekdayRows = await db
    .select({
      workoutDayId: workoutDayWeekdays.workoutDayId,
      weekday: workoutDayWeekdays.weekday,
    })
    .from(workoutDayWeekdays)
    .innerJoin(workoutDays, eq(workoutDayWeekdays.workoutDayId, workoutDays.id))
    .where(eq(workoutDays.workoutId, workoutId));

  const weekdaysByDay = new Map<number, number[]>();
  for (const row of weekdayRows) {
    const list = weekdaysByDay.get(row.workoutDayId) ?? [];
    list.push(row.weekday);
    weekdaysByDay.set(row.workoutDayId, list);
  }

  const prescriptionsByExercise = new Map<number, Array<typeof exerciseSets.$inferSelect>>();
  if (dayExercises.length > 0) {
    const prescriptionRows = await db
      .select()
      .from(exerciseSets)
      .where(
        inArray(
          exerciseSets.exerciseId,
          dayExercises.map((exercise) => exercise.id),
        ),
      );

    for (const row of prescriptionRows) {
      const list = prescriptionsByExercise.get(row.exerciseId) ?? [];
      list.push(row);
      prescriptionsByExercise.set(row.exerciseId, list);
    }
  }

  return { days, dayExercises, prescriptionsByExercise, weekdaysByDay };
};

const seedSessions = async (
  plan: AthletePlan,
  athleteId: number,
  workoutId: number,
) => {
  if (plan.lastSessionOn === null) {
    return { sessions: 0, sets: 0 };
  }

  const [already] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, athleteId),
        eq(workoutSessions.workoutId, workoutId),
        eq(workoutSessions.status, "completed"),
      ),
    )
    .limit(1);

  if (already) {
    return { sessions: 0, sets: 0 };
  }

  const { days, dayExercises, prescriptionsByExercise, weekdaysByDay } =
    await loadProgramTree(workoutId);

  const today = todayInRome();
  const end = plan.lastSessionOn < today ? plan.lastSessionOn : today;
  const rng = mulberry32(hashString(plan.email));
  let sessionCount = 0;
  let setCount = 0;

  const dayForDate = (isoDate: string) => {
    const weekday = getRomeWeekday(romeDateTime(isoDate, 12, 0));
    return (
      days.find((item) => (weekdaysByDay.get(item.id) ?? []).includes(weekday)) ??
      (isoDate === plan.lastSessionOn ? days[0] : undefined)
    );
  };

  for (const isoDate of eachDate(plan.startsAt, end)) {
    const day = dayForDate(isoDate);
    if (!day) {
      continue;
    }
    if (isoDate !== plan.lastSessionOn && rng() < plan.skipRate) {
      continue;
    }

    const hour = 7 + Math.floor(rng() * 13);
    const minute = Math.floor(rng() * 50);
    const startedAt = romeDateTime(isoDate, hour, minute);
    const durationMin = 42 + Math.floor(rng() * 32);
    const completedAt = new Date(startedAt.getTime() + durationMin * 60_000);
    const weekIndex = Math.floor(
      (Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${plan.startsAt}T00:00:00Z`)) /
        (7 * 86_400_000),
    );
    const abandoned = isoDate !== plan.lastSessionOn && rng() < 0.04;
    const notes =
      !abandoned && rng() < 0.18
        ? sessionNotes[Math.floor(rng() * sessionNotes.length)]
        : null;

    const [session] = await db
      .insert(workoutSessions)
      .values({
        workoutId,
        workoutDayId: day.id,
        userId: athleteId,
        status: abandoned ? "abandoned" : "completed",
        startedAt,
        completedAt,
        notes,
      })
      .returning({ id: workoutSessions.id });

    sessionCount += 1;

    if (abandoned) {
      continue;
    }

    const dayItems = dayExercises.filter((item) => item.workoutDayId === day.id);
    const rows: Array<typeof loggedSets.$inferInsert> = [];
    let elapsed = 4;

    for (const exercise of dayItems) {
      const prescriptions = [...(prescriptionsByExercise.get(exercise.id) ?? [])].sort(
        (a, b) => a.setNumber - b.setNumber,
      );
      const weight = workingWeight(exercise.name, plan.sex, plan.strength, weekIndex);

      for (const prescription of prescriptions) {
        const drop =
          prescription.setNumber === prescriptions.length && rng() < 0.35 ? 1 : 0;
        const reps = Math.max(3, prescription.reps - drop);
        const rir = Math.max(0, 3 - (prescription.setNumber - 1));
        elapsed += 3 + prescription.setNumber;
        rows.push({
          sessionId: session.id,
          exerciseId: exercise.id,
          setNumber: prescription.setNumber,
          weightKg: weight,
          reps,
          rir,
          loggedAt: new Date(startedAt.getTime() + elapsed * 60_000),
        });
      }
    }

    if (rows.length > 0) {
      await db.insert(loggedSets).values(rows);
      setCount += rows.length;
    }
  }

  return { sessions: sessionCount, sets: setCount };
};

async function seedCoachPortfolio() {
  const coach = await ensureCoach();
  const passwordHash = await hashPassword(ATHLETE_PASSWORD);

  const hypertrophy = await db
    .select({ id: workouts.id, name: workouts.name })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, coach.id),
        eq(workouts.kind, "template"),
        eq(workouts.name, "Ipertrofia 5 Giorni"),
      ),
    )
    .limit(1);

  const templates = new Map<string, number>();
  if (hypertrophy[0]) {
    templates.set(hypertrophy[0].name, hypertrophy[0].id);
  }

  templates.set("PPL palestra 3×", await ensureTemplate(coach.id, pplProgram()));
  templates.set("Upper Lower forza", await ensureTemplate(coach.id, upperLowerProgram()));
  templates.set("Full body 2×", await ensureTemplate(coach.id, fullBodyProgram()));

  if (!templates.has("Ipertrofia 5 Giorni")) {
    throw new Error("Missing existing template Ipertrofia 5 Giorni");
  }

  let athletesCreated = 0;
  let sessionsCreated = 0;
  let setsCreated = 0;

  for (const plan of ATHLETES) {
    const templateId = templates.get(plan.templateName);
    if (!templateId) {
      throw new Error(`Template not found: ${plan.templateName}`);
    }

    const athlete = await ensureAthlete(plan, passwordHash);
    if (athlete.created) {
      athletesCreated += 1;
    }
    await ensureLink(coach.id, athlete.id, plan.joinedAt);
    const workoutId = await ensureAssignment(
      coach.id,
      athlete.id,
      templateId,
      plan.startsAt,
      plan.expiresAt,
    );
    const seeded = await seedSessions(plan, athlete.id, workoutId);
    sessionsCreated += seeded.sessions;
    setsCreated += seeded.sets;

    if (plan.extra) {
      const extraTemplateId = templates.get(plan.extra.templateName);
      if (!extraTemplateId) {
        throw new Error(`Template not found: ${plan.extra.templateName}`);
      }
      await ensureAssignment(
        coach.id,
        athlete.id,
        extraTemplateId,
        plan.extra.startsAt,
        plan.extra.expiresAt,
      );
    }

    console.log(
      `${plan.name}: workout ${workoutId}, +${seeded.sessions} sessioni, +${seeded.sets} serie`,
    );
  }

  console.log(
    `Done. coach=${coach.id} templates=${templates.size} newAthletes=${athletesCreated} sessions=${sessionsCreated} sets=${setsCreated}`,
  );
}

seedCoachPortfolio()
  .then(async () => {
    await closeDb();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });

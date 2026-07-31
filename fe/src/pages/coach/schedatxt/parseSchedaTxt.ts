import {
  FREQUENCY_OPTIONS,
  REST_SEC_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  type WorkoutSettings,
} from "../../../api/schemas/workout";

export type DraftSetPrescription = {
  setNumber: number;
  reps: number;
  restSec: number;
};

export type DraftExercise = {
  clientId: string;
  serverId?: number;
  name: string;
  catalogId?: string | null;
  setPrescriptions: DraftSetPrescription[];
};

export type DraftWorkoutDay = {
  clientId: string;
  serverId?: number;
  name: string;
  sortOrder: number;
  weekdays: number[];
  exercises: DraftExercise[];
};

const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  defaultRestSec: 90,
  workoutType: "Forza + Ipertrofia",
  frequency: "3× a settimana",
};

export type ParsedScheda = {
  name: string;
  settings: WorkoutSettings;
  days: DraftWorkoutDay[];
};

export type ParseSchedaResult =
  | { ok: true; value: ParsedScheda }
  | { ok: false; error: string };

const DAY_HEADER =
  /^(?:##\s*)?(?:giorno|day)\s+(\d+)\s*[:.\-–—]?\s*(.*)$/i;
const EXERCISE_MARKDOWN = /^###\s+(.+)$/;
const META_LINE =
  /^(frequenza|tipo|recupero\s*default|nome|titolo)\s*[:：]\s*(.+)$/i;
const REPS_LABELED = /^reps?\s*[:：]\s*(.+)$/i;
const REST_LABELED = /^recupero\s*[:：]\s*(.+)$/i;
const TITLE_LINE = /^#\s+(.+)$/;
const SET_TOKEN = /^(\d+)(?:\s*@\s*(\d+))?$/;

const createClientId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const snapRestOption = (value: number): WorkoutSettings["defaultRestSec"] => {
  let best: (typeof REST_SEC_OPTIONS)[number] = REST_SEC_OPTIONS[1];
  for (const option of REST_SEC_OPTIONS) {
    if (Math.abs(option - value) < Math.abs(best - value)) {
      best = option;
    }
  }
  return best;
};

const toPrescriptions = (
  sets: Array<{ reps: number; restSec: number }>,
): DraftSetPrescription[] =>
  sets.map((set, index) => ({
    setNumber: index + 1,
    reps: set.reps,
    restSec: set.restSec,
  }));

const parseSetLine = (
  raw: string,
  defaultRestSec: number,
): Array<{ reps: number; restSec: number }> | null => {
  const cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }

  const hasAt = cleaned.includes("@");
  const parts = hasAt || /^\d+(?:\s+\d+)+$/.test(cleaned)
    ? cleaned.split(/\s+/).filter(Boolean)
    : cleaned.split(/[-–,]/).map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const sets: Array<{ reps: number; restSec: number }> = [];

  for (const part of parts) {
    const match = part.match(SET_TOKEN);
    if (!match) {
      return null;
    }

    const reps = Number(match[1]);
    const restSec = match[2] === undefined ? defaultRestSec : Number(match[2]);

    if (!Number.isInteger(reps) || reps < 1 || !Number.isFinite(restSec) || restSec < 0) {
      return null;
    }

    sets.push({ reps, restSec: Math.round(restSec) });
  }

  return sets;
};

const parseRestValues = (
  raw: string,
  count: number,
): number[] | null => {
  const parts = raw
    .split(/[-–,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const values = parts.map((part) => Number(part));
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return null;
  }

  if (values.length === 1) {
    return Array.from({ length: count }, () => Math.round(values[0]!));
  }

  if (values.length !== count) {
    return null;
  }

  return values.map((value) => Math.round(value));
};

const isSetsLine = (line: string): boolean =>
  REPS_LABELED.test(line) ||
  line.includes("@") ||
  /^\d+([-–,\s]+\d+)+$/.test(line) ||
  /^\d+$/.test(line);

/**
 * Parse a coach scheda TXT into a builder draft.
 */
export const parseSchedaTxt = (input: string): ParseSchedaResult => {
  const text = input.replace(/^\uFEFF/, "").trim();

  if (!text) {
    return { ok: false, error: "Incolla il testo della scheda" };
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim());

  let name = "Nuova scheda";
  let settings: WorkoutSettings = { ...DEFAULT_WORKOUT_SETTINGS };
  const days: DraftWorkoutDay[] = [];

  let currentDay: DraftWorkoutDay | null = null;
  let currentExercise: DraftExercise | null = null;
  let pendingReps: number[] | null = null;

  const pushExercise = (): ParseSchedaResult | null => {
    if (!currentExercise) {
      return null;
    }

    if (pendingReps && pendingReps.length > 0) {
      currentExercise.setPrescriptions = pendingReps.map((reps, index) => ({
        setNumber: index + 1,
        reps,
        restSec: settings.defaultRestSec,
      }));
      pendingReps = null;
    }

    if (currentExercise.setPrescriptions.length === 0) {
      return {
        ok: false,
        error: `L'esercizio "${currentExercise.name}" non ha serie/reps`,
      };
    }

    currentDay?.exercises.push(currentExercise);
    currentExercise = null;
    return null;
  };

  const pushDay = (): ParseSchedaResult | null => {
    const exerciseError = pushExercise();
    if (exerciseError) {
      return exerciseError;
    }

    if (!currentDay) {
      return null;
    }

    if (currentDay.exercises.length === 0) {
      return {
        ok: false,
        error: `Il giorno "${currentDay.name}" non ha esercizi`,
      };
    }

    days.push(currentDay);
    currentDay = null;
    return null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (!line || line.startsWith("//")) {
      continue;
    }

    const titleMatch = line.match(TITLE_LINE);
    if (titleMatch && !line.startsWith("##")) {
      name = titleMatch[1]!.trim() || name;
      continue;
    }

    const meta = line.match(META_LINE);
    if (meta && !currentDay) {
      const key = meta[1]!.toLowerCase().replace(/\s+/g, " ");
      const value = meta[2]!.trim();

      if (key === "nome" || key === "titolo") {
        name = value || name;
      } else if (key === "frequenza") {
        const frequency = FREQUENCY_OPTIONS.find(
          (option) => option.toLowerCase() === value.toLowerCase(),
        );
        if (frequency) {
          settings = { ...settings, frequency };
        }
      } else if (key === "tipo") {
        const workoutType = WORKOUT_TYPE_OPTIONS.find(
          (option) => option.toLowerCase() === value.toLowerCase(),
        );
        if (workoutType) {
          settings = { ...settings, workoutType };
        }
      } else if (key.startsWith("recupero")) {
        const rest = Number(value);
        if (Number.isFinite(rest) && rest >= 0) {
          settings = { ...settings, defaultRestSec: snapRestOption(rest) };
        }
      }
      continue;
    }

    const dayMatch = line.match(DAY_HEADER);
    if (dayMatch) {
      const dayError = pushDay();
      if (dayError) {
        return dayError;
      }

      const dayNumber = Number(dayMatch[1]);
      const title = dayMatch[2]?.trim();
      currentDay = {
        clientId: createClientId(),
        name: title || `Giorno ${dayNumber}`,
        sortOrder: days.length,
        weekdays: [],
        exercises: [],
      };
      continue;
    }

    if (!currentDay) {
      continue;
    }

    const restLabeled = line.match(REST_LABELED);
    if (restLabeled) {
      if (!currentExercise || !pendingReps) {
        return {
          ok: false,
          error: `Recupero senza reps precedenti (riga ${index + 1})`,
        };
      }

      const rests = parseRestValues(
        restLabeled[1]!,
        pendingReps.length,
      );

      if (!rests) {
        return {
          ok: false,
          error: `Recupero non valido per "${currentExercise.name}" (riga ${index + 1})`,
        };
      }

      currentExercise.setPrescriptions = pendingReps.map((reps, setIndex) => ({
        setNumber: setIndex + 1,
        reps,
        restSec: rests[setIndex]!,
      }));
      pendingReps = null;
      continue;
    }

    const exerciseMarkdown = line.match(EXERCISE_MARKDOWN);
    if (exerciseMarkdown) {
      const exerciseError = pushExercise();
      if (exerciseError) {
        return exerciseError;
      }

      currentExercise = {
        clientId: createClientId(),
        name: exerciseMarkdown[1]!.trim(),
        catalogId: null,
        setPrescriptions: [],
      };
      continue;
    }

    const repsLabeled = line.match(REPS_LABELED);
    if (repsLabeled) {
      if (!currentExercise) {
        return {
          ok: false,
          error: `Reps senza esercizio (riga ${index + 1})`,
        };
      }

      const sets = parseSetLine(repsLabeled[1]!, settings.defaultRestSec);
      if (!sets) {
        return {
          ok: false,
          error: `Serie/reps non valide (riga ${index + 1})`,
        };
      }

      // Lookahead: if next non-empty is recupero, wait
      let nextIndex = index + 1;
      while (nextIndex < lines.length && !lines[nextIndex]) {
        nextIndex += 1;
      }
      const nextLine = lines[nextIndex] ?? "";

      if (REST_LABELED.test(nextLine)) {
        pendingReps = sets.map((set) => set.reps);
      } else {
        currentExercise.setPrescriptions = toPrescriptions(sets);
        pendingReps = null;
      }
      continue;
    }

    if (isSetsLine(line)) {
      if (!currentExercise) {
        return {
          ok: false,
          error: `Serie senza esercizio (riga ${index + 1})`,
        };
      }

      const sets = parseSetLine(line, settings.defaultRestSec);
      if (!sets) {
        return {
          ok: false,
          error: `Serie/reps non valide (riga ${index + 1})`,
        };
      }

      currentExercise.setPrescriptions = toPrescriptions(sets);
      pendingReps = null;
      continue;
    }

    // Plain exercise name
    const exerciseError = pushExercise();
    if (exerciseError) {
      return exerciseError;
    }

    currentExercise = {
      clientId: createClientId(),
      name: line.replace(/^[-*]\s+/, "").trim(),
      catalogId: null,
      setPrescriptions: [],
    };
  }

  const finalError = pushDay();
  if (finalError) {
    return finalError;
  }

  if (days.length === 0) {
    return {
      ok: false,
      error: 'Nessun giorno trovato. Usa righe come "Giorno 1: Upper"',
    };
  }

  return {
    ok: true,
    value: {
      name,
      settings,
      days: days.map((day, index) => ({
        ...day,
        sortOrder: index,
        weekdays:
          day.weekdays.length > 0
            ? day.weekdays
            : index < 7
              ? [index]
              : [],
      })),
    },
  };
};

export const SCHEDA_TXT_AI_PROMPT = `Sei un coach di sala. Genera una scheda di allenamento in italiano nel formato testuale ESATTO qui sotto, senza markdown extra, senza commenti, senza spiegazioni prima o dopo.

Formato obbligatorio:

# <Nome scheda>
Frequenza: <una tra: 2× a settimana | 3× a settimana | 4× a settimana | 5× a settimana>
Tipo: <una tra: Forza + Ipertrofia | Forza | Ipertrofia | Resistenza>
Recupero default: <60|90|120|150>

## Giorno 1: <titolo giorno>
### <Nome esercizio>
<reps>@<recupero_sec> <reps>@<recupero_sec> ...

### <Nome esercizio>
<reps>@<recupero_sec> ...

## Giorno 2: <titolo giorno>
### <Nome esercizio>
...

Regole:
- Usa giorni logici numerati (Giorno 1, Giorno 2, …), NON giorni della settimana.
- Ogni esercizio ha almeno 1 serie.
- reps è un intero ≥ 1; recupero è in secondi.
- Se vuoi un solo recupero per tutte le serie puoi scrivere:
  reps: 12-10-8-6
  recupero: 90
  oppure omettere @recupero e usare il default della scheda: 12 10 8 6
- Non inventare esercizi pericolosi o attrezzatura impossibile in palestra standard.
- Output: SOLO il testo della scheda.

Parametri richiesti dall'utente (compila tu se mancano con scelte ragionevoli):
- Obiettivo:
- Livello:
- Giorni di allenamento a settimana:
- Vincoli/infortuni:
- Attrezzatura disponibile:
`;

export const SCHEDA_TXT_EXAMPLE = `# Full Body principiante
Frequenza: 3× a settimana
Tipo: Forza + Ipertrofia
Recupero default: 90

## Giorno 1: Upper
### Panca piana
12@90 10@90 8@120 6@120

### Rematore bilanciere
10@90 10@90 8@90

## Giorno 2: Lower
### Squat
8@150 8@150 6@180

### Affondi
reps: 10-10-10
recupero: 90
`;

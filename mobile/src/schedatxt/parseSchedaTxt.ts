import {
  FREQUENCY_OPTIONS,
  REST_SEC_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  type WorkoutSettings,
} from "../api/schemas/workout";
import catalogPromptExercises from "./catalogPromptExercises.json" with { type: "json" };

export type LoadUnit = "kg" | "percent_1rm";

export type DraftSetPrescription = {
  setNumber: number;
  reps: number;
  repsMax: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit;
  rir: number | null;
  restSec: number;
};

export type DraftExercise = {
  clientId: string;
  serverId?: number;
  name: string;
  catalogId?: string | null;
  nameIt?: string | null;
  nameEn?: string | null;
  imageUrl?: string | null;
  imageUrlEnd?: string | null;
  notes: string;
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
const LOAD_LABELED = /^carico\s*[:：]\s*(.+)$/i;
const EFFORT_LABELED = /^(rir|rpe)\s*[:：]\s*(.+)$/i;
const NOTES_LABELED = /^note\s*[:：]\s*(.*)$/i;
const TITLE_LINE = /^#\s+(.+)$/;
// "10", "10@90", "8-12@90" (a rep range needs the @rest, otherwise 8-12 means two sets).
const SET_TOKEN = /^(\d+)(?:[-–](\d+))?(?:\s*@\s*(\d+))?$/;
const LOAD_TOKEN = /^(\d+(?:[.,]\d+)?)(kg|%)$/i;

const MAX_LOAD_KG = 1000;
const MAX_LOAD_PERCENT_1RM = 100;
const MAX_RIR = 10;

const createClientId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type CatalogPromptExercise = {
  id: string;
  name: string;
  nameIt: string;
  label: string;
};

const CATALOG_MEDIA_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const normalizeCatalogTitle = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const catalogByTitle = new Map<string, CatalogPromptExercise>();
for (const exercise of catalogPromptExercises as CatalogPromptExercise[]) {
  catalogByTitle.set(normalizeCatalogTitle(exercise.label), exercise);
  const english = normalizeCatalogTitle(exercise.name);
  if (!catalogByTitle.has(english)) {
    catalogByTitle.set(english, exercise);
  }
}

const CATALOG_PROMPT_NAMES = (catalogPromptExercises as CatalogPromptExercise[])
  .map((exercise) => exercise.label)
  .join("\n");

const draftExercise = (title: string): DraftExercise => {
  const catalog = catalogByTitle.get(normalizeCatalogTitle(title));
  const folder = catalog ? encodeURIComponent(catalog.id) : null;

  return {
    clientId: createClientId(),
    name: title,
    catalogId: catalog?.id ?? null,
    nameIt: catalog?.nameIt ?? null,
    nameEn: catalog?.name ?? null,
    imageUrl: folder ? `${CATALOG_MEDIA_BASE}/${folder}/0.jpg` : null,
    imageUrlEnd: folder ? `${CATALOG_MEDIA_BASE}/${folder}/1.jpg` : null,
    notes: "",
    setPrescriptions: [],
  };
};

const snapRestOption = (value: number): WorkoutSettings["defaultRestSec"] => {
  let best: (typeof REST_SEC_OPTIONS)[number] = REST_SEC_OPTIONS[1];
  for (const option of REST_SEC_OPTIONS) {
    if (Math.abs(option - value) < Math.abs(best - value)) {
      best = option;
    }
  }
  return best;
};

type ParsedReps = { reps: number; repsMax: number | null };
type ParsedSet = ParsedReps & { restSec: number };
type ParsedLoad = { loadValue: number; loadUnit: LoadUnit };

const toPrescriptions = (sets: ParsedSet[]): DraftSetPrescription[] =>
  sets.map((set, index) => ({
    setNumber: index + 1,
    reps: set.reps,
    repsMax: set.repsMax,
    loadValue: null,
    loadUnit: "kg",
    rir: null,
    restSec: set.restSec,
  }));

const parseSetLine = (
  raw: string,
  defaultRestSec: number,
): ParsedSet[] | null => {
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

  const sets: ParsedSet[] = [];

  for (const part of parts) {
    const match = part.match(SET_TOKEN);
    if (!match) {
      return null;
    }

    const reps = Number(match[1]);
    const repsMax = match[2] === undefined ? null : Number(match[2]);
    const restSec = match[3] === undefined ? defaultRestSec : Number(match[3]);

    if (!Number.isInteger(reps) || reps < 1 || !Number.isFinite(restSec) || restSec < 0) {
      return null;
    }

    if (repsMax !== null && repsMax < reps) {
      return null;
    }

    const isSingleCount = repsMax === reps;
    sets.push({ reps, repsMax: isSingleCount ? null : repsMax, restSec: Math.round(restSec) });
  }

  return sets;
};

// One value applies to every set; otherwise there must be one value per set.
function spreadOverSets<T>(values: T[], count: number): T[] | null {
  if (values.length === 1) {
    return Array.from({ length: count }, () => values[0]!);
  }

  return values.length === count ? values : null;
}

const parseLoadToken = (token: string): ParsedLoad | null => {
  const match = token.match(LOAD_TOKEN);
  if (!match) {
    return null;
  }

  const loadValue = Number(match[1]!.replace(",", "."));
  const loadUnit: LoadUnit = match[2] === "%" ? "percent_1rm" : "kg";
  const maxLoad = loadUnit === "kg" ? MAX_LOAD_KG : MAX_LOAD_PERCENT_1RM;

  if (!Number.isFinite(loadValue) || loadValue <= 0 || loadValue > maxLoad) {
    return null;
  }

  return { loadValue, loadUnit };
};

// "80kg", "80 kg 80 kg 70 kg", "75%", "75% 1RM".
const parseLoadValues = (raw: string): ParsedLoad[] | null => {
  const tokens = raw
    .replace(/\s*1rm/gi, "")
    .replace(/\s+(?=kg|%)/gi, "")
    .split(/[\s;]+/)
    .map((token) => token.replace(/,$/, ""))
    .filter(Boolean);
  const loads = tokens.map(parseLoadToken);

  if (tokens.length === 0 || loads.some((load) => load === null)) {
    return null;
  }

  return loads.filter((load): load is ParsedLoad => load !== null);
};

// The builder stores RIR only: RPE 8 means 2 reps in reserve.
const parseRirValues = (scale: string, raw: string): number[] | null => {
  const values = raw
    .split(/[\s;]+/)
    .map((part) => part.replace(/,$/, ""))
    .filter(Boolean)
    .map((part) => Number(part.replace(",", ".")));
  const isRpe = scale.toLowerCase() === "rpe";
  const rirs = values.map((value) => (isRpe ? Math.round(MAX_RIR - value) : value));
  const hasInvalid = rirs.some(
    (rir) => !Number.isInteger(rir) || rir < 0 || rir > MAX_RIR,
  );

  if (values.length === 0 || hasInvalid) {
    return null;
  }

  return rirs;
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
  let pendingReps: ParsedReps[] | null = null;

  const pushExercise = (): ParseSchedaResult | null => {
    if (!currentExercise) {
      return null;
    }

    if (pendingReps && pendingReps.length > 0) {
      currentExercise.setPrescriptions = toPrescriptions(
        pendingReps.map((reps) => ({ ...reps, restSec: settings.defaultRestSec })),
      );
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

      currentExercise.setPrescriptions = toPrescriptions(
        pendingReps.map((reps, setIndex) => ({ ...reps, restSec: rests[setIndex]! })),
      );
      pendingReps = null;
      continue;
    }

    const notesLabeled = line.match(NOTES_LABELED);
    if (notesLabeled) {
      if (!currentExercise) {
        return { ok: false, error: `Note senza esercizio (riga ${index + 1})` };
      }

      const notes = notesLabeled[1]!.trim();
      currentExercise.notes = currentExercise.notes ? `${currentExercise.notes}\n${notes}` : notes;
      continue;
    }

    const loadLabeled = line.match(LOAD_LABELED);
    if (loadLabeled) {
      if (!currentExercise || currentExercise.setPrescriptions.length === 0) {
        return { ok: false, error: `Carico senza serie precedenti (riga ${index + 1})` };
      }

      const parsedLoads = parseLoadValues(loadLabeled[1]!);
      const loads = parsedLoads
        ? spreadOverSets(parsedLoads, currentExercise.setPrescriptions.length)
        : null;

      if (!loads) {
        return {
          ok: false,
          error: `Carico non valido per "${currentExercise.name}" (riga ${index + 1})`,
        };
      }

      currentExercise.setPrescriptions = currentExercise.setPrescriptions.map(
        (entry, setIndex) => ({ ...entry, ...loads[setIndex]! }),
      );
      continue;
    }

    const effortLabeled = line.match(EFFORT_LABELED);
    if (effortLabeled) {
      if (!currentExercise || currentExercise.setPrescriptions.length === 0) {
        return { ok: false, error: `RIR/RPE senza serie precedenti (riga ${index + 1})` };
      }

      const parsedRirs = parseRirValues(effortLabeled[1]!, effortLabeled[2]!);
      const rirs = parsedRirs
        ? spreadOverSets(parsedRirs, currentExercise.setPrescriptions.length)
        : null;

      if (!rirs) {
        return {
          ok: false,
          error: `RIR/RPE non valido per "${currentExercise.name}" (riga ${index + 1})`,
        };
      }

      currentExercise.setPrescriptions = currentExercise.setPrescriptions.map(
        (entry, setIndex) => ({ ...entry, rir: rirs[setIndex]! }),
      );
      continue;
    }

    const exerciseMarkdown = line.match(EXERCISE_MARKDOWN);
    if (exerciseMarkdown) {
      const exerciseError = pushExercise();
      if (exerciseError) {
        return exerciseError;
      }

      currentExercise = draftExercise(exerciseMarkdown[1]!.trim());
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
        pendingReps = sets.map((set) => ({ reps: set.reps, repsMax: set.repsMax }));
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

    currentExercise = draftExercise(line.replace(/^[-*]\s+/, "").trim());
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
Carico: <facoltativo, es. 80kg oppure 75%>
RIR: <facoltativo, 0–10>
Note: <facoltativo, una riga per l'atleta>

### <Nome esercizio>
<reps_min>-<reps_max>@<recupero_sec> ...

## Giorno 2: <titolo giorno>
### <Nome esercizio>
...

Regole:
- Usa giorni logici numerati (Giorno 1, Giorno 2, …), NON giorni della settimana.
- Ogni esercizio ha almeno 1 serie.
- reps è un intero ≥ 1; recupero è in secondi.
- Per un range di ripetizioni scrivi min-max seguito da @recupero, es. 8-12@90.
- Carico, RIR e Note vanno dopo la riga delle serie e sono facoltativi. Un solo valore vale per tutte le serie, altrimenti scrivi un valore per serie separato da spazi (es. Carico: 80kg 80kg 70kg). Il carico è in kg oppure in % del massimale (es. 75%). Puoi usare RPE al posto di RIR (RPE: 8 equivale a RIR 2).
- Se vuoi un solo recupero per tutte le serie puoi scrivere:
  reps: 12-10-8-6
  recupero: 90
  oppure omettere @recupero e usare il default della scheda: 12 10 8 6
- Non inventare esercizi pericolosi o attrezzatura impossibile in palestra standard.
- Il titolo dopo ### deve essere copiato identico da «Nomi esercizio ammessi». Non tradurre, non abbreviare, non inventare varianti. Se due esercizi hanno lo stesso nome italiano, usa la riga che include anche il nome inglese.
- Output: SOLO il testo della scheda.

Nomi esercizio ammessi:
${CATALOG_PROMPT_NAMES}

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
Carico: 75%
RIR: 2

### Rematore bilanciere
8-12@90 8-12@90 8-12@90
Note: schiena neutra, tira verso l'ombelico

## Giorno 2: Lower
### Squat
8@150 8@150 6@180

### Affondi
reps: 10-10-10
recupero: 90
`;

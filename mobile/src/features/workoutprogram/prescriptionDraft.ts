import type { LoadUnit } from "../../api/schemas/exercise";

export const REST_SEC_OPTIONS = [60, 90, 120, 150] as const;

// The phone builder edits reps and rest only; range, load and RIR come from the web
// builder or the TXT import and are carried through so saving here does not erase them.
export type DraftPrescription = {
  key: string;
  reps: string;
  restSec: number;
  repsMax: number | null;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  rir: number | null;
};

type ServerPrescription = {
  setNumber: number;
  reps: number;
  restSec: number | null;
  repsMax?: number | null;
  loadValue?: number | null;
  loadUnit?: LoadUnit | null;
  rir?: number | null;
};

export const DEFAULT_REST_SEC = 90;

export function newPrescription(
  reps = "10",
  restSec: number = DEFAULT_REST_SEC,
): DraftPrescription {
  return {
    key: `set-${Date.now()}-${Math.random()}`,
    reps,
    restSec,
    repsMax: null,
    loadValue: null,
    loadUnit: null,
    rir: null,
  };
}

/** A new set that keeps everything the previous one prescribed. */
export function copyPrescription(source: DraftPrescription): DraftPrescription {
  return { ...source, key: `set-${Date.now()}-${Math.random()}` };
}

export function prescriptionsFromUniform(
  sets: number,
  reps: number,
  restSec: number,
): DraftPrescription[] {
  const safeSets = Math.max(1, Math.trunc(sets));
  return Array.from({ length: safeSets }, () =>
    newPrescription(String(reps), restSec),
  );
}

export function prescriptionsFromServer(
  entries: ServerPrescription[],
  fallbackRestSec: number = DEFAULT_REST_SEC,
): DraftPrescription[] {
  if (entries.length === 0) {
    return [newPrescription("10", fallbackRestSec)];
  }

  return [...entries]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((entry) => {
      const hasLoad = entry.loadValue != null;

      return {
        ...newPrescription(String(entry.reps), entry.restSec ?? fallbackRestSec),
        repsMax: entry.repsMax ?? null,
        loadValue: entry.loadValue ?? null,
        loadUnit: hasLoad ? (entry.loadUnit ?? null) : null,
        rir: entry.rir ?? null,
      };
    });
}

export function toSetPrescriptions(drafts: DraftPrescription[]) {
  return drafts.map((item, index) => {
    const reps = Number(item.reps);
    // Raising reps here above the range top would make the server reject the range.
    const keepsRange = item.repsMax !== null && item.repsMax > reps;

    return {
      setNumber: index + 1,
      reps,
      repsMax: keepsRange ? item.repsMax : null,
      loadValue: item.loadValue,
      loadUnit: item.loadUnit,
      rir: item.rir,
      restSec: item.restSec,
    };
  });
}

export function validatePrescriptionDrafts(
  drafts: DraftPrescription[],
): string | null {
  if (drafts.length === 0) {
    return "Aggiungi almeno una serie";
  }

  for (const item of drafts) {
    const reps = Number(item.reps);
    if (!Number.isFinite(reps) || reps < 1) {
      return "Le ripetizioni di ogni serie devono essere un numero positivo";
    }

    if (!(REST_SEC_OPTIONS as readonly number[]).includes(item.restSec)) {
      return "Recupero non valido";
    }
  }

  return null;
}

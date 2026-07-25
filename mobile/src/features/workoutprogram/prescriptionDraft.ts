export const REST_SEC_OPTIONS = [60, 90, 120, 150] as const;

export type DraftPrescription = {
  key: string;
  reps: string;
  restSec: number;
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
  };
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
  entries: Array<{ setNumber: number; reps: number; restSec: number | null }>,
  fallbackRestSec: number = DEFAULT_REST_SEC,
): DraftPrescription[] {
  if (entries.length === 0) {
    return [newPrescription("10", fallbackRestSec)];
  }

  return [...entries]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((entry) =>
      newPrescription(String(entry.reps), entry.restSec ?? fallbackRestSec),
    );
}

export function toSetPrescriptions(drafts: DraftPrescription[]) {
  return drafts.map((item, index) => ({
    setNumber: index + 1,
    reps: Number(item.reps),
    restSec: item.restSec,
  }));
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

export function cycleRestSec(current: number): number {
  const index = REST_SEC_OPTIONS.indexOf(
    current as (typeof REST_SEC_OPTIONS)[number],
  );
  const nextIndex = index < 0 ? 0 : (index + 1) % REST_SEC_OPTIONS.length;
  return REST_SEC_OPTIONS[nextIndex]!;
}

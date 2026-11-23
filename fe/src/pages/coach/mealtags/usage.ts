import { isNumberSpokenWithVowel } from "@utils/romeCalendar";

// Limits from the contract (docs/contracts/al-piano-pasti.md, Limiti).
export const MAX_LIVE_TAGS = 30;
export const MAX_TAG_NAME_LENGTH = 60;

/** "in 3 piani", "in 1 piano", "in nessun piano": active plans that use the tag. */
export function planUsage(planCount: number): string {
  if (planCount === 0) {
    return "in nessun piano";
  }

  return planCount === 1 ? "in 1 piano" : `in ${planCount} piani`;
}

/** "2 piani e 1 template", "1 piano", "3 template"; null when nothing uses the tag. */
export function usageList(planCount: number, templateCount: number): string | null {
  const plans = planCount === 1 ? "1 piano" : `${planCount} piani`;
  const templates = `${templateCount} template`;

  if (planCount === 0 && templateCount === 0) {
    return null;
  }

  if (templateCount === 0) {
    return plans;
  }

  return planCount === 0 ? templates : `${plans} e ${templates}`;
}

/** What an archived tag is still used by: "ancora in 2 piani e 1 template". */
export function archivedUsage(planCount: number, templateCount: number): string {
  const usage = usageList(planCount, templateCount);
  return usage === null ? "non più usato" : `ancora in ${usage}`;
}

const LOG_KEEPS_NAME =
  "Il registro dei clienti tiene il nome di quando hanno segnato il pasto.";

/** Shown under a tag being renamed: "Cambia il nome in tutti gli 8 piani. Il registro…". */
export function renameNote(planCount: number): string {
  if (planCount === 0) {
    return `Il nuovo nome vale in tutti i piani e i template. ${LOG_KEEPS_NAME}`;
  }

  if (planCount === 1) {
    return `Cambia il nome nell'unico piano che lo usa. ${LOG_KEEPS_NAME}`;
  }

  const article = isNumberSpokenWithVowel(planCount) ? "gli" : "i";
  return `Cambia il nome in tutti ${article} ${planCount} piani. ${LOG_KEEPS_NAME}`;
}

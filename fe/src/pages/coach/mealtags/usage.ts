import { isNumberSpokenWithVowel } from "@utils/romeCalendar";

// Limits from the contract (docs/contracts/al-piano-pasti.md, Limiti).
export const MAX_LIVE_TAGS = 30;
export const MAX_TAG_NAME_LENGTH = 60;

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

/** What a live tag is used by: "in 2 piani e 1 template", "in nessun piano" when nothing does. */
export function tagUsage(planCount: number, templateCount: number): string {
  const usage = usageList(planCount, templateCount);
  return usage === null ? "in nessun piano" : `in ${usage}`;
}

/** What an archived tag is still used by: "ancora in 2 piani e 1 template". */
export function archivedUsage(planCount: number, templateCount: number): string {
  const usage = usageList(planCount, templateCount);
  return usage === null ? "non più usato" : `ancora in ${usage}`;
}

const LOG_KEEPS_NAME =
  "Il registro dei clienti tiene il nome di quando hanno segnato il pasto.";

const plansReached = (planCount: number): string | null => {
  if (planCount === 0) {
    return null;
  }

  if (planCount === 1) {
    return "nell'unico piano che lo usa";
  }

  const article = isNumberSpokenWithVowel(planCount) ? "gli" : "i";
  return `in tutti ${article} ${planCount} piani`;
};

const templatesReached = (templateCount: number): string | null =>
  templateCount === 0 ? null : `in ${templateCount} template`;

/** Shown under a tag being renamed: "Cambia il nome in tutti gli 8 piani e in 1 template. Il registro…". */
export function renameNote(planCount: number, templateCount: number): string {
  const reached = [plansReached(planCount), templatesReached(templateCount)].filter(
    (place): place is string => place !== null,
  );

  if (reached.length === 0) {
    return `Il nuovo nome vale in tutti i piani e i template. ${LOG_KEEPS_NAME}`;
  }

  return `Cambia il nome ${reached.join(" e ")}. ${LOG_KEEPS_NAME}`;
}

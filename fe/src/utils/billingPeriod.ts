import type { PeriodUnit } from "@api";

/** How long an offer or a subscription lasts before it renews. */
export type BillingPeriod = {
  periodUnit: PeriodUnit;
  periodCount: number;
};

const UNIT_LABELS: Record<PeriodUnit, { one: string; many: string }> = {
  month: { one: "mese", many: "mesi" },
  week: { one: "settimana", many: "settimane" },
};

/** "1 mese", "3 mesi", "1 settimana", "12 settimane". */
export function formatDuration(period: BillingPeriod): string {
  const labels = UNIT_LABELS[period.periodUnit];
  const unitLabel = period.periodCount === 1 ? labels.one : labels.many;

  return `${period.periodCount} ${unitLabel}`;
}

/** "ogni mese", "ogni 3 mesi", "ogni settimana", "ogni 12 settimane". */
export function formatEveryPeriod(period: BillingPeriod): string {
  const labels = UNIT_LABELS[period.periodUnit];

  if (period.periodCount === 1) {
    return `ogni ${labels.one}`;
  }

  return `ogni ${period.periodCount} ${labels.many}`;
}

/** Price list column: "Ricorrente" or "Una tantum". */
export function formatRenewalKind(isRecurring: boolean): string {
  return isRecurring ? "Ricorrente" : "Una tantum";
}

/** Subscription card: "Ogni mese", "Ogni 3 mesi" or "Una tantum". */
export function formatRenewalSchedule(period: BillingPeriod & { isRecurring: boolean }): string {
  if (!period.isRecurring) {
    return "Una tantum";
  }

  const every = formatEveryPeriod(period);

  return `${every.charAt(0).toUpperCase()}${every.slice(1)}`;
}

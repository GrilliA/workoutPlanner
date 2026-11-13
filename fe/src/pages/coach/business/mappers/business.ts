import type { BusinessRange, CoachBusiness } from "@api";
import { formatEuros } from "@utils/money";
import type {
  BusinessRangeOption,
  BusinessView,
  CollectedChartModel,
  LostSummary,
  RenewalsSummary,
} from "../types";

export const BUSINESS_RANGE_OPTIONS: BusinessRangeOption[] = [
  { range: "6m", label: "6 mesi" },
  { range: "12m", label: "12 mesi" },
];

const PERIOD_LABELS: Record<BusinessRange, string> = {
  "6m": "ultimi 6 mesi",
  "12m": "ultimi 12 mesi",
};

// A `YYYY-MM` key is a calendar month: read and formatted in UTC, so no time zone moves it.
const firstDayOf = (month: string): Date => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
};

const shortMonthFormat = new Intl.DateTimeFormat("it-IT", { month: "short", timeZone: "UTC" });
const longMonthFormat = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-06" → "giu". */
export const formatShortMonth = (month: string): string =>
  shortMonthFormat.format(firstDayOf(month)).replace(".", "");

/** "2026-06" → "giugno 2026". */
export const formatLongMonth = (month: string): string => longMonthFormat.format(firstDayOf(month));

const NBSP = "\u00a0";
const CENTS_PER_EURO = 100;
const EUROS_PER_THOUSAND = 1000;
const thousandsFormat = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

/** Whole euros, thousands as "k": 34550 → "346 €", 123000 → "1,2k €". Fits above a bar. */
export const formatCompactEuros = (cents: number): string => {
  const euros = Math.round(cents / CENTS_PER_EURO);

  if (euros < EUROS_PER_THOUSAND) {
    return `${euros}${NBSP}€`;
  }

  return `${thousandsFormat.format(euros / EUROS_PER_THOUSAND)}k${NBSP}€`;
};

const clientsLabel = (count: number): string => (count === 1 ? "1 cliente" : `${count} clienti`);

export const buildCollectedChart = (business: CoachBusiness): CollectedChartModel => {
  const bestMonthCents = Math.max(0, ...business.collectedByMonth.map((entry) => entry.amountCents));
  const currentMonth = business.today.slice(0, 7);
  const totalCents = business.collectedByMonth.reduce((total, entry) => total + entry.amountCents, 0);

  const bars = business.collectedByMonth.map((entry) => {
    const heightRatio = bestMonthCents === 0 ? 0 : entry.amountCents / bestMonthCents;
    return {
      label: formatShortMonth(entry.month),
      heightRatio,
      isCurrentMonth: entry.month === currentMonth,
      accessibilityLabel: `${formatLongMonth(entry.month)}: ${formatEuros(entry.amountCents)}`,
      compactAmount: formatCompactEuros(entry.amountCents),
      amount: formatEuros(entry.amountCents),
    };
  });

  if (totalCents === 0) {
    return { bars, summary: `Nessun pagamento segnato negli ${PERIOD_LABELS[business.range]}.` };
  }

  return {
    bars,
    summary: `${formatEuros(totalCents)} incassati negli ${PERIOD_LABELS[business.range]}.`,
  };
};

const renewedClientsLabel = (renewed: number, due: number): string => {
  if (renewed === 0) {
    return `Nessun cliente su ${due} ha rinnovato`;
  }

  if (renewed === 1) {
    return `1 cliente su ${due} ha rinnovato`;
  }

  return `${renewed} clienti su ${due} hanno rinnovato`;
};

export const buildRenewalsSummary = (renewals: CoachBusiness["renewals90Days"]): RenewalsSummary => {
  if (renewals.due === 0) {
    return { value: null, hint: "Nessun cliente con una scadenza negli ultimi 90 giorni." };
  }

  const percent = Math.round((renewals.renewed / renewals.due) * 100);
  return {
    value: `${percent}%`,
    hint: `${renewedClientsLabel(renewals.renewed, renewals.due)} negli ultimi 90 giorni`,
  };
};

export const buildLostSummary = (business: CoachBusiness): LostSummary => {
  const total = business.lostByMonth.reduce((sum, entry) => sum + entry.count, 0);
  const months = business.lostByMonth.map((entry) => ({
    label: formatShortMonth(entry.month),
    count: String(entry.count),
  }));

  return { total: `${clientsLabel(total)} negli ${PERIOD_LABELS[business.range]}`, months };
};

export const mapCoachBusiness = (business: CoachBusiness): BusinessView => {
  const currentMonthEntry = business.collectedByMonth.at(-1);
  const collectedThisMonth = currentMonthEntry?.amountCents ?? 0;

  return {
    isEmpty: business.subscriptionCount === 0,
    kpis: [
      {
        id: "recurring",
        label: "Entrate ricorrenti",
        value: formatEuros(business.monthlyRecurringCents),
        hint: `al mese, da ${clientsLabel(business.recurringClientCount)}`,
      },
      {
        id: "expected",
        label: "Atteso",
        value: formatEuros(business.expectedNext30DaysCents),
        hint: "rinnovi nei prossimi 30 giorni",
      },
      {
        id: "collected",
        label: "Incassato questo mese",
        value: formatEuros(collectedThisMonth),
        hint: "pagamenti segnati nel mese",
      },
    ],
    chart: buildCollectedChart(business),
    renewals: buildRenewalsSummary(business.renewals90Days),
    lost: buildLostSummary(business),
  };
};

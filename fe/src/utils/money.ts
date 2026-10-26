// Money travels as integer cents (0..1_000_000, the API limit); the coach types and reads euros.
const MAX_CENTS = 1_000_000;
const CENTS_PER_EURO = 100;

// Digits, then at most 2 decimals after a comma or a point. A thousands separator
// ("1.000", "1.000,50") does not fit, so "1.000" is never read as one euro.
const EURO_AMOUNT_PATTERN = /^(\d+)(?:[.,](\d{1,2}))?$/;

const NON_BREAKING_SPACE = "\u00a0";

const AMOUNT_RANGE_ERROR = "L'importo deve essere tra 0 e 10.000 €.";

type ParsedAmount = { ok: true; cents: number } | { ok: false; error: string };

export function parseEurosToCents(text: string): ParsedAmount {
  const trimmed = text.trim();

  if (trimmed === "") {
    return { ok: false, error: "Inserisci un importo." };
  }

  const match = EURO_AMOUNT_PATTERN.exec(trimmed);

  if (match === null) {
    return {
      ok: false,
      error: "Scrivi l'importo in euro, con al massimo 2 decimali (es. 80 o 80,50).",
    };
  }

  const euros = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = euros * CENTS_PER_EURO + fraction;

  if (cents > MAX_CENTS) {
    return { ok: false, error: AMOUNT_RANGE_ERROR };
  }

  return { ok: true, cents };
}

const formatEuroNumber = (cents: number, useGrouping: boolean): string => {
  const hasCents = cents % CENTS_PER_EURO !== 0;
  const formatter = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
    useGrouping,
  });

  return formatter.format(cents / CENTS_PER_EURO);
};

/** 8000 → "80 €", 8050 → "80,50 €". The space does not break, so the sign stays with the number. */
export function formatEuros(cents: number): string {
  return `${formatEuroNumber(cents, true)}${NON_BREAKING_SPACE}€`;
}

/** The value to prefill an amount field with: 8050 → "80,50", no grouping, no sign. */
export function formatCentsAsInput(cents: number): string {
  return formatEuroNumber(cents, false);
}

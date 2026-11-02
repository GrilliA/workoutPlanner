import type { Payment, PaymentMethod, PaymentOption, PaymentPreview, PaymentStart } from "@api";
import { formatDuration, type BillingPeriod } from "@utils/billingPeriod";
import { isValidDateKey } from "@utils/romeCalendar";
import type { PauseDates } from "./pause";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Contanti",
  bank_transfer: "Bonifico",
  satispay: "Satispay",
  paypal: "PayPal",
  other: "Altro",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "satispay",
  "paypal",
  "other",
];

export const MIN_PAYMENT_PERIODS = 1;
export const MAX_PAYMENT_PERIODS = 12;

/** "Mesi pagati" for a monthly subscription, "Periodi pagati (3 mesi l'uno)" for longer periods. */
export function paymentPeriodsLabel(period: BillingPeriod): string {
  if (period.periodCount !== 1) {
    return `Periodi pagati (${formatDuration(period)} l'uno)`;
  }

  return period.periodUnit === "month" ? "Mesi pagati" : "Settimane pagate";
}

export function paidOnError(paidOn: string, today: string): string | null {
  if (!isValidDateKey(paidOn)) {
    return "Data non valida (tra il 2000 e il 2099).";
  }

  if (paidOn > today) {
    return "La data del pagamento non può essere nel futuro.";
  }

  return null;
}

/** The start the coach picked if the preview still allows it, otherwise the suggested one. */
export function chosenPaymentOption(
  preview: PaymentPreview,
  pickedStart: PaymentStart | null,
): PaymentOption | null {
  const picked = preview.options.find((option) => option.start === pickedStart);

  if (picked !== undefined && picked.isAllowed) {
    return picked;
  }

  return preview.options.find((option) => option.start === preview.suggestedStart) ?? null;
}

/**
 * Paid days inside a pause are not given back when the payment comes after the pause was
 * created (contract R2, "Limite accettato"). A coverage that starts on the last day of the
 * pause loses nothing worth a warning.
 */
export function doesCoverageCrossPause(
  coverage: { coversFrom: string; coversTo: string },
  pause: PauseDates,
): boolean {
  return coverage.coversTo >= pause.startsOn && coverage.coversFrom < pause.endsOn;
}

/**
 * D7: the method of the last payment recorded. The list is sorted by `paidOn`, so a payment
 * dated in the past but recorded last is not first: the highest id is.
 */
export function lastPaymentMethod(payments: Payment[] | undefined): PaymentMethod | null {
  const allPayments = payments ?? [];
  const latestId = Math.max(...allPayments.map((payment) => payment.id));
  const latestRecorded = allPayments.find((payment) => payment.id === latestId);

  return latestRecorded?.method ?? null;
}

import { useId, useLayoutEffect, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import {
  ApiError,
  getCoachClientPaymentPreview,
  recordCoachClientPayment,
  useMutation,
  useQuery,
  type Pause,
  type PaymentInput,
  type PaymentMethod,
  type PaymentOption,
  type PaymentStart,
  type Subscription,
} from "@api";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { cx } from "@utils/cx";
import { formatCentsAsInput, formatEuros, parseEurosToCents } from "@utils/money";
import { formatLongDate, withDatePreposition } from "@utils/romeCalendar";
import {
  MAX_PAYMENT_PERIODS,
  MIN_PAYMENT_PERIODS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  chosenPaymentOption,
  doesCoverageCrossPause,
  paidOnError,
  paymentPeriodsLabel,
} from "../mappers/paymentForm";
import "./style.css";

const MAX_NOTE_LENGTH = 500;
const RECORD_ERROR = "Impossibile registrare il pagamento";
const PREVIEW_ERROR = "Impossibile calcolare la nuova scadenza";

type PaymentDraft = {
  periods: number;
  paidOn: string;
  /** null while the amount follows the suggested one. */
  amountText: string | null;
  /** null while the start follows the suggested one. */
  start: PaymentStart | null;
  method: PaymentMethod | null;
  note: string;
};

type PaymentDraftErrors = {
  amount?: string;
  method?: string;
};

type PaymentDialogProps = {
  athleteId: number;
  /** "<Nome> · <Offerta> · <prezzo> ogni <durata>". */
  subtitle: string;
  subscription: Subscription;
  activePause: Pause | null;
  /** D7: the method of the last payment, null for the first one. */
  defaultMethod: PaymentMethod | null;
  today: string;
  onRecorded: (subscription: Subscription) => void;
  onClose: () => void;
  onWriteError: (error: ApiError, fallback: string) => void;
};

const START_LABELS: Record<PaymentStart, string> = {
  paid_through: "Dalla fine del periodo pagato",
  paid_on: "Dal giorno del pagamento",
};

const coverageSentence = (option: PaymentOption): string => {
  if (option.start === "paid_on") {
    return "Il nuovo periodo riparte dal giorno del pagamento.";
  }

  return `Il nuovo periodo parte ${withDatePreposition("dal", option.coversFrom)}, la fine di quello già pagato, anche se il pagamento arriva in ritardo.`;
};

/** Mounted only while open, so every opening starts from a fresh draft. */
export function PaymentDialog({
  athleteId,
  subtitle,
  subscription,
  activePause,
  defaultMethod,
  today,
  onRecorded,
  onClose,
  onWriteError,
}: PaymentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const periodsLabelId = useId();
  const methodLabelId = useId();
  const amountId = useId();
  const paidOnId = useId();
  const noteId = useId();
  const noteCountId = useId();
  const [draft, setDraft] = useState<PaymentDraft>({
    periods: MIN_PAYMENT_PERIODS,
    paidOn: today,
    amountText: null,
    start: null,
    method: defaultMethod,
    note: "",
  });
  const [errors, setErrors] = useState<PaymentDraftErrors>({});

  // showModal() puts the dialog in the top layer, traps focus and handles Esc.
  // Closing it on unmount gives the focus back to the button that opened it:
  // a layout effect cleans up while the dialog is still in the document.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;

    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog !== null && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const paidOnProblem = paidOnError(draft.paidOn, today);

  // A new key aborts the request still in flight, so a late answer never wins.
  const preview = useQuery({
    queryKey: [athleteId, draft.paidOn, draft.periods],
    queryFn: ({ signal }) => {
      if (paidOnProblem !== null) {
        return Promise.resolve(null);
      }

      return getCoachClientPaymentPreview(
        athleteId,
        { paidOn: draft.paidOn, periods: draft.periods },
        { signal },
      );
    },
    fallback: PREVIEW_ERROR,
    throwOnError: false,
    onError: (error) => {
      toast.error(ApiError.messageFrom(error, PREVIEW_ERROR));
    },
  });

  const record = useMutation({
    mutationFn: (input: PaymentInput) => recordCoachClientPayment(athleteId, input),
    fallback: RECORD_ERROR,
    onSuccess: (recorded) => onRecorded(recorded.subscription),
    onError: (error) => onWriteError(error, RECORD_ERROR),
  });

  const previewData = preview.data ?? null;
  const option = previewData === null ? null : chosenPaymentOption(previewData, draft.start);
  const suggestedAmountText =
    previewData === null ? "" : formatCentsAsInput(previewData.suggestedAmountCents);
  const amountText = draft.amountText ?? suggestedAmountText;
  const amount = parseEurosToCents(amountText);
  const isCoverageShown = option !== null && !preview.isPending;
  const isPreviewLoading = paidOnProblem === null && preview.isPending;
  const isPreviewMissing = paidOnProblem === null && !preview.isPending && option === null;
  const isPauseCrossed =
    isCoverageShown && activePause !== null && doesCoverageCrossPause(option, activePause);
  const amountHelper = previewData?.isSuggestedAmountCapped
    ? "Importo suggerito limitato a 10.000 €"
    : undefined;
  const submitLabel = amount.ok ? `Registra ${formatEuros(amount.cents)}` : "Registra";
  const canSubmit = isCoverageShown && paidOnProblem === null;

  const changeDraft = (changes: Partial<PaymentDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  // A new count of periods brings back the suggested amount and start (AC25, AC26).
  const changePeriods = (periods: number) => {
    changeDraft({ periods, amountText: null, start: null });
  };

  // While the payment is being saved, Esc does nothing: closing would hide its outcome.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();

    if (!record.isPending) {
      onClose();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextErrors: PaymentDraftErrors = {
      amount: amount.ok ? undefined : amount.error,
      method: draft.method === null ? "Scegli il metodo di pagamento." : undefined,
    };
    setErrors(nextErrors);

    if (!amount.ok || draft.method === null || option === null || paidOnProblem !== null) {
      return;
    }

    const note = draft.note.trim();

    record.mutate({
      amountCents: amount.cents,
      paidOn: draft.paidOn,
      method: draft.method,
      periods: draft.periods,
      start: option.start,
      note: note === "" ? null : note,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="payment-dialog"
      aria-labelledby={titleId}
      aria-describedby={subtitleId}
      onCancel={handleCancel}
    >
      <form className="body" noValidate onSubmit={handleSubmit}>
        <header className="header">
          <div>
            <h2 id={titleId} className="title">
              Registra pagamento
            </h2>
            <p id={subtitleId} className="subtitle">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="close"
            aria-label="Chiudi"
            onClick={onClose}
            disabled={record.isPending}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="periods">
          <span id={periodsLabelId} className="field-label">
            {paymentPeriodsLabel(subscription)}
          </span>
          <div className="stepper" role="group" aria-labelledby={periodsLabelId}>
            <button
              type="button"
              className="step"
              aria-label="Un periodo in meno"
              disabled={draft.periods <= MIN_PAYMENT_PERIODS}
              onClick={() => changePeriods(draft.periods - 1)}
            >
              −
            </button>
            <output className="count" aria-live="polite">
              {draft.periods}
            </output>
            <button
              type="button"
              className="step"
              aria-label="Un periodo in più"
              disabled={draft.periods >= MAX_PAYMENT_PERIODS}
              onClick={() => changePeriods(draft.periods + 1)}
            >
              +
            </button>
          </div>
        </div>

        <div className="row">
          <Input
            id={amountId}
            label="Importo (€)"
            inputMode="decimal"
            value={amountText}
            onChange={(event) => changeDraft({ amountText: event.target.value })}
            helper={amountHelper}
            error={errors.amount}
          />
          <Input
            id={paidOnId}
            label="Pagato il"
            type="date"
            max={today}
            value={draft.paidOn}
            onChange={(event) => changeDraft({ paidOn: event.target.value, start: null })}
            error={paidOnProblem ?? undefined}
          />
        </div>

        {isPreviewLoading ? (
          <div className="coverage" role="status">
            <span className="sr-only">Calcolo della nuova scadenza…</span>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="70%" />
          </div>
        ) : null}

        {isPreviewMissing ? (
          <p className="coverage" role="status">
            Nuova scadenza non disponibile: cambia la data o i periodi per riprovare.
          </p>
        ) : null}

        {isCoverageShown && previewData !== null ? (
          <>
            <fieldset className="starts">
              <legend className="field-label">Da quando parte</legend>
              {previewData.options.map((candidate) => (
                <label
                  key={candidate.start}
                  className={cx("start", !candidate.isAllowed && "start--disabled")}
                >
                  <input
                    type="radio"
                    name="payment-start"
                    value={candidate.start}
                    checked={option.start === candidate.start}
                    disabled={!candidate.isAllowed}
                    onChange={() => changeDraft({ start: candidate.start })}
                  />
                  <span className="start-text">
                    <span className="start-label">
                      {START_LABELS[candidate.start]} ({formatLongDate(candidate.coversFrom)})
                    </span>
                    <span className="start-detail">
                      {candidate.isAllowed
                        ? `fino ${withDatePreposition("al", candidate.coversTo)}`
                        : "accorcerebbe il periodo già pagato"}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="coverage" role="status">
              <span className="field-label">Pagato fino al</span>
              <p className="change">
                <s className="old">{formatLongDate(subscription.paidThrough)}</s>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
                <span className="sr-only">diventa</span>
                <strong className="new">{formatLongDate(option.coversTo)}</strong>
              </p>
              <p className="sentence">{coverageSentence(option)}</p>
            </div>
          </>
        ) : null}

        {isPauseCrossed && activePause !== null ? (
          <p className="pause-warning" role="alert">
            {`Questa copertura attraversa la pausa ${withDatePreposition("dal", activePause.startsOn)} ${withDatePreposition("al", activePause.endsOn)}: i giorni pagati che cadono nella pausa non vengono recuperati. Per recuperarli: annulla la pausa, registra il pagamento, poi rimetti la pausa.`}
          </p>
        ) : null}

        <div className="methods">
          <span id={methodLabelId} className="field-label">
            Metodo
          </span>
          <div className="method-list" role="group" aria-labelledby={methodLabelId}>
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                type="button"
                className="method"
                aria-pressed={draft.method === method}
                onClick={() => changeDraft({ method })}
              >
                {PAYMENT_METHOD_LABELS[method]}
              </button>
            ))}
          </div>
          {errors.method !== undefined && draft.method === null ? (
            <p className="field-error" role="alert">
              {errors.method}
            </p>
          ) : null}
        </div>

        <div className="note">
          <label htmlFor={noteId} className="field-label">
            Nota (facoltativa)
          </label>
          <textarea
            id={noteId}
            className="input-base"
            rows={2}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Es. pagato in palestra"
            value={draft.note}
            onChange={(event) => changeDraft({ note: event.target.value })}
            aria-describedby={noteCountId}
          />
          <span id={noteCountId} className="note-count">
            {`${draft.note.length}/${MAX_NOTE_LENGTH}`}
          </span>
        </div>

        <footer className="footer">
          <Button variant="ghost" size="lg" onClick={onClose} disabled={record.isPending}>
            Annulla
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={record.isPending}
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}

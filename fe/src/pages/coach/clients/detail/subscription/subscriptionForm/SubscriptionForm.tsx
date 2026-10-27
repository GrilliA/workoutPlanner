import { useState, type FormEvent } from "react";
import {
  saveCoachClientSubscription,
  useMutation,
  type ApiError,
  type Offer,
  type Pause,
  type Payment,
  type Subscription,
  type SubscriptionDetail,
  type SubscriptionInput,
} from "@api";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { toast } from "@components/toast";
import {
  doesChangeAdvanceRevision,
  draftFromSubscription,
  draftPaidThrough,
  draftPriceText,
  draftWithOffer,
  hasUndoableChange,
  newSubscriptionDraft,
  offerChoices,
  subscriptionChanges,
  subscriptionInputForCreation,
  validateSubscriptionDraft,
  type SubscriptionDraft,
  type SubscriptionDraftErrors,
} from "../mappers/subscriptionDraft";
import { offerLabel } from "../mappers/subscriptionSummary";
import "./style.css";

const SAVE_ERROR = "Impossibile salvare l'abbonamento";

type SubscriptionFormProps = {
  athleteId: number;
  /** undefined while the price list loads or after it failed. */
  offers: Offer[] | undefined;
  /** The stored subscription when editing, null when creating. */
  saved: Subscription | null;
  payments: Payment[] | undefined;
  activePause: Pause | null;
  today: string;
  onSaved: (detail: SubscriptionDetail) => void;
  onCancel: () => void;
  onWriteError: (error: ApiError, fallback: string) => void;
};

export function SubscriptionForm({
  athleteId,
  offers,
  saved,
  payments,
  activePause,
  today,
  onSaved,
  onCancel,
  onWriteError,
}: SubscriptionFormProps) {
  const isEditing = saved !== null;
  const [draft, setDraft] = useState<SubscriptionDraft>(() =>
    saved === null ? newSubscriptionDraft(today) : draftFromSubscription(saved),
  );
  const [errors, setErrors] = useState<SubscriptionDraftErrors>({});

  const save = useMutation({
    mutationFn: (input: SubscriptionInput) => saveCoachClientSubscription(athleteId, input),
    fallback: SAVE_ERROR,
    onSuccess: (detail) => {
      toast.success(isEditing ? "Abbonamento aggiornato" : "Abbonamento creato");
      onSaved(detail);
    },
    onError: (error) => onWriteError(error, SAVE_ERROR),
  });

  const offerList = offers ?? [];
  const offerOptions = offerChoices(offerList, saved?.offerId ?? null).map((offer) => ({
    value: String(offer.id),
    label: offerLabel(offer),
  }));
  const validation = validateSubscriptionDraft(draft, offerList, saved);
  const pendingChanges = saved !== null && validation.ok ? subscriptionChanges(saved, validation.value) : {};
  const isRevisionWarningShown =
    saved !== null &&
    doesChangeAdvanceRevision(saved, pendingChanges, offerList) &&
    hasUndoableChange(payments, activePause);

  const changeDraft = (changes: Partial<SubscriptionDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    if (saved === null) {
      save.mutate(subscriptionInputForCreation(validation.value));
      return;
    }

    const hasChanges = Object.keys(pendingChanges).length > 0;

    if (!hasChanges) {
      onCancel();
      return;
    }

    save.mutate(pendingChanges);
  };

  const title = isEditing ? "Modifica abbonamento" : "Nuovo abbonamento";
  const submitLabel = isEditing ? "Salva" : "Crea abbonamento";
  const offerPlaceholder = offers === undefined ? "Listino non disponibile" : "Scegli un'offerta";

  return (
    <section className="subscription-form" aria-labelledby="subscription-form-title">
      <h2 id="subscription-form-title" className="title">
        {title}
      </h2>

      <form className="fields" noValidate onSubmit={handleSubmit}>
        <Select
          id="subscription-offer"
          label="Offerta"
          value={draft.offerId}
          options={offerOptions}
          placeholder={offerPlaceholder}
          onChange={(offerId) => setDraft((current) => draftWithOffer(current, offerId))}
          required={!isEditing}
          error={errors.offerId}
        />

        <Input
          id="subscription-price"
          label="Prezzo concordato (€)"
          inputMode="decimal"
          value={draftPriceText(draft, offerList)}
          onChange={(event) => changeDraft({ priceText: event.target.value })}
          error={errors.price}
        />

        <Input
          id="subscription-started-on"
          label="Inizio"
          type="date"
          value={draft.startedOn}
          onChange={(event) => changeDraft({ startedOn: event.target.value })}
          error={errors.startedOn}
        />

        {isEditing ? (
          <Input
            id="subscription-paid-through"
            label="Pagato fino al"
            type="date"
            value={saved.paidThrough}
            readOnly
            helper="Si sposta solo con pagamenti e pause"
            error={errors.paidThrough}
          />
        ) : (
          <Input
            id="subscription-paid-through"
            label="Pagato fino al"
            type="date"
            min={draft.startedOn}
            value={draftPaidThrough(draft)}
            onChange={(event) => changeDraft({ paidThrough: event.target.value })}
            helper="Lascia uguale all'inizio se non ha ancora pagato"
            error={errors.paidThrough}
          />
        )}

        {isRevisionWarningShown ? (
          <p className="warning" role="alert">
            Dopo questa modifica non potrai più annullare l&apos;ultimo pagamento o la pausa.
          </p>
        ) : null}

        <div className="actions">
          <Button variant="ghost" onClick={onCancel} disabled={save.isPending}>
            Annulla
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}

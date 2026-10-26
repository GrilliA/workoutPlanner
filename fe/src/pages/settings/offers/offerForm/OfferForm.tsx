import { useState, type FormEvent } from "react";
import {
  createCoachOffer,
  updateCoachOffer,
  useMutation,
  type ApiError,
  type Offer,
  type OfferPatch,
} from "@api";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { toast } from "@components/toast";
import {
  EMPTY_OFFER_DRAFT,
  draftFromOffer,
  offerChanges,
  validateOfferDraft,
  type OfferDraft,
  type OfferDraftErrors,
} from "../mappers/offerDraft";
import "./style.css";

const PERIOD_UNIT_OPTIONS = [
  { value: "month", label: "Mesi" },
  { value: "week", label: "Settimane" },
];

const RENEWAL_OPTIONS = [
  { value: "recurring", label: "Ricorrente" },
  { value: "once", label: "Una tantum" },
];

const CREATE_ERROR = "Impossibile aggiungere l'offerta";
const UPDATE_ERROR = "Impossibile salvare l'offerta";

type OfferFormProps = {
  /** The offer being edited, or null for a new one. */
  offer: Offer | null;
  onSaved: () => void;
  onCancel: () => void;
  onWriteError: (error: ApiError, fallback: string) => void;
};

export function OfferForm({ offer, onSaved, onCancel, onWriteError }: OfferFormProps) {
  const isEditing = offer !== null;
  const [draft, setDraft] = useState<OfferDraft>(() =>
    offer === null ? EMPTY_OFFER_DRAFT : draftFromOffer(offer),
  );
  const [errors, setErrors] = useState<OfferDraftErrors>({});

  const create = useMutation({
    mutationFn: createCoachOffer,
    fallback: CREATE_ERROR,
    onSuccess: () => {
      toast.success("Offerta aggiunta");
      setDraft(EMPTY_OFFER_DRAFT);
      onSaved();
    },
    onError: (error) => onWriteError(error, CREATE_ERROR),
  });

  const update = useMutation({
    mutationFn: (variables: { offerId: number; patch: OfferPatch }) =>
      updateCoachOffer(variables.offerId, variables.patch),
    fallback: UPDATE_ERROR,
    onSuccess: () => {
      toast.success("Offerta aggiornata");
      onSaved();
    },
    onError: (error) => onWriteError(error, UPDATE_ERROR),
  });

  const isSaving = create.isPending || update.isPending;

  const changeDraft = (changes: Partial<OfferDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateOfferDraft(draft);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});

    if (offer === null) {
      create.mutate(result.value);
      return;
    }

    const patch = offerChanges(offer, result.value);
    const hasChanges = Object.keys(patch).length > 0;

    if (!hasChanges) {
      onCancel();
      return;
    }

    update.mutate({ offerId: offer.id, patch });
  };

  const title = isEditing ? "Modifica offerta" : "Nuova offerta";
  const submitLabel = isEditing ? "Salva" : "Aggiungi offerta";

  return (
    <section className="offer-form" aria-labelledby="offer-form-title">
      <h2 id="offer-form-title" className="title">
        {title}
      </h2>
      {isEditing ? <p className="editing">{offer.name}</p> : null}

      <form className="fields" noValidate onSubmit={handleSubmit}>
        <div className="field-name">
          <Input
            id="offer-name"
            label="Nome"
            value={draft.name}
            onChange={(event) => changeDraft({ name: event.target.value })}
            placeholder="Es. Coaching + nutrizione"
            maxLength={100}
            error={errors.name}
            autoFocus={isEditing}
          />
        </div>

        <Input
          id="offer-price"
          label="Prezzo (€)"
          inputMode="decimal"
          value={draft.priceText}
          onChange={(event) => changeDraft({ priceText: event.target.value })}
          placeholder="0"
          error={errors.price}
        />

        <div className="duration">
          <Input
            id="offer-period-count"
            label="Durata"
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            step={1}
            value={draft.periodCountText}
            onChange={(event) => changeDraft({ periodCountText: event.target.value })}
            error={errors.periodCount}
          />
          <Select
            id="offer-period-unit"
            label="Unità"
            value={draft.periodUnit}
            options={PERIOD_UNIT_OPTIONS}
            onChange={(value) => changeDraft({ periodUnit: value === "week" ? "week" : "month" })}
          />
        </div>

        <Select
          id="offer-renewal"
          label="Rinnovo"
          value={draft.isRecurring ? "recurring" : "once"}
          options={RENEWAL_OPTIONS}
          onChange={(value) => changeDraft({ isRecurring: value === "recurring" })}
        />

        <div className="actions">
          {isEditing ? (
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              Annulla
            </Button>
          ) : null}
          <Button type="submit" variant="primary" loading={isSaving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}

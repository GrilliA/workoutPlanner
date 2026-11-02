import { useState, type FormEvent } from "react";
import {
  saveCoachClientSubscription,
  useMutation,
  type ApiError,
  type Subscription,
  type SubscriptionDetail,
} from "@api";
import { Button } from "@components/button";
import { ConfirmDialog } from "@components/confirmDialog";
import { Input } from "@components/input";
import { toast } from "@components/toast";
import { isValidDateKey, withDatePreposition } from "@utils/romeCalendar";
import "./style.css";

const SAVE_ERROR = "Impossibile aggiornare l'abbonamento";

type SubscriptionEndProps = {
  athleteId: number;
  subscription: Subscription;
  today: string;
  onSaved: (detail: SubscriptionDetail) => void;
  onWriteError: (error: ApiError, fallback: string) => void;
};

const endedOnError = (endedOn: string, startedOn: string): string | null => {
  if (!isValidDateKey(endedOn)) {
    return "Data non valida (tra il 2000 e il 2099).";
  }

  if (endedOn < startedOn) {
    return "La chiusura non può essere prima dell'inizio.";
  }

  return null;
};

/** D5: close on a chosen day (today by default) and resume with `endedOn: null`. */
export function SubscriptionEnd({
  athleteId,
  subscription,
  today,
  onSaved,
  onWriteError,
}: SubscriptionEndProps) {
  const [endedOn, setEndedOn] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const save = useMutation({
    mutationFn: (nextEndedOn: string | null) =>
      saveCoachClientSubscription(athleteId, { endedOn: nextEndedOn }),
    fallback: SAVE_ERROR,
    onSuccess: (detail, nextEndedOn) => {
      toast.success(nextEndedOn === null ? "Abbonamento ripreso" : "Abbonamento chiuso");
      onSaved(detail);
    },
    onError: (saveError) => onWriteError(saveError, SAVE_ERROR),
  });

  if (subscription.endedOn !== null) {
    const isEndingLater = subscription.endedOn > today;
    const endedOnText = withDatePreposition("il", subscription.endedOn);
    const statusText = isEndingLater ? `Termina ${endedOnText}` : `Chiuso ${endedOnText}`;

    return (
      <section className="subscription-end" aria-label="Chiusura">
        <p className="status">{statusText}</p>
        <Button variant="secondary" size="sm" loading={save.isPending} onClick={() => save.mutate(null)}>
          Riprendi
        </Button>
      </section>
    );
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = endedOnError(endedOn, subscription.startedOn);
    setError(problem);

    if (problem === null) {
      setIsConfirmOpen(true);
    }
  };

  const confirmClose = () => {
    setIsConfirmOpen(false);
    save.mutate(endedOn);
  };

  const confirmMessage = `L'abbonamento si chiude ${withDatePreposition("il", endedOn)}: da quel giorno non potrai registrare pagamenti né pause. Puoi riprenderlo quando vuoi.`;

  return (
    <section className="subscription-end" aria-labelledby="subscription-end-title">
      <h2 id="subscription-end-title" className="title">
        Chiudi abbonamento
      </h2>
      <form className="fields" noValidate onSubmit={handleSubmit}>
        <Input
          id="subscription-ended-on"
          label="Data di chiusura"
          type="date"
          min={subscription.startedOn}
          value={endedOn}
          onChange={(event) => setEndedOn(event.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" variant="secondary" loading={save.isPending}>
          Chiudi abbonamento
        </Button>
      </form>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Chiudere l'abbonamento?"
        message={confirmMessage}
        confirmLabel="Chiudi abbonamento"
        cancelLabel="Indietro"
        onConfirm={confirmClose}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </section>
  );
}

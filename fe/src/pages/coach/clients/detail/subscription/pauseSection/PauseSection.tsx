import { useState, type FormEvent } from "react";
import {
  createCoachClientPause,
  removeCoachClientPause,
  useMutation,
  type ApiError,
  type Pause,
  type Subscription,
} from "@api";
import { Button } from "@components/button";
import { ConfirmDialog } from "@components/confirmDialog";
import { Input } from "@components/input";
import { toast } from "@components/toast";
import {
  addRomeDays,
  formatLongDate,
  isValidDateKey,
  withDatePreposition,
} from "@utils/romeCalendar";
import { describePausePreview, pauseDatesError, type PauseDates } from "../mappers/pause";
import "./style.css";

const CREATE_ERROR = "Impossibile registrare la pausa";
const REMOVE_ERROR = "Impossibile togliere la pausa";

type PauseSectionProps = {
  athleteId: number;
  subscription: Subscription;
  activePause: Pause | null;
  isEnded: boolean;
  /** The notice that says why the form is off when the subscription is closed. */
  endedNoticeId: string;
  /** A reload is on its way: `canRemove` may be stale until it arrives. */
  isRefreshing: boolean;
  today: string;
  onPauseCreated: (created: { pause: Pause; subscription: Subscription }) => void;
  onChanged: () => void;
  onWriteError: (error: ApiError, fallback: string) => void;
};

export function PauseSection(props: PauseSectionProps) {
  if (props.activePause !== null && !props.isEnded) {
    return <ActivePause {...props} activePause={props.activePause} />;
  }

  return <NewPause {...props} />;
}

function NewPause({
  athleteId,
  subscription,
  isEnded,
  endedNoticeId,
  today,
  onPauseCreated,
  onWriteError,
}: PauseSectionProps) {
  const [pause, setPause] = useState<PauseDates>({ startsOn: today, endsOn: "" });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (dates: PauseDates) => createCoachClientPause(athleteId, dates),
    fallback: CREATE_ERROR,
    onSuccess: (created) => {
      toast.success("Pausa registrata");
      setPause({ startsOn: today, endsOn: "" });
      onPauseCreated(created);
    },
    onError: (error) => onWriteError(error, CREATE_ERROR),
  });

  const areDatesComplete = isValidDateKey(pause.startsOn) && isValidDateKey(pause.endsOn);
  const datesError = areDatesComplete
    ? pauseDatesError(pause, { today, startedOn: subscription.startedOn })
    : null;
  const isPreviewShown = areDatesComplete && datesError === null;
  const hasPauseEnded = isPreviewShown && pause.endsOn < today;

  const changePause = (changes: Partial<PauseDates>) => {
    setPause((current) => ({ ...current, ...changes }));
    setSubmitError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!areDatesComplete) {
      setSubmitError("Data non valida (tra il 2000 e il 2099).");
      return;
    }

    if (datesError === null) {
      create.mutate(pause);
    }
  };

  const inlineError = submitError ?? datesError;

  return (
    <section className="pause-section" aria-labelledby="pause-section-title">
      <div className="intro">
        <h2 id="pause-section-title" className="title">
          Metti in pausa
        </h2>
        <p className="hint">Per vacanze o infortunio. La scheda non cambia.</p>
      </div>

      <form className="form" noValidate onSubmit={handleSubmit}>
        <fieldset className="dates" disabled={isEnded}>
          <legend className="sr-only">Date della pausa</legend>
          <Input
            id="pause-starts-on"
            label="Dal"
            type="date"
            min={addRomeDays(today, -31)}
            value={pause.startsOn}
            onChange={(event) => changePause({ startsOn: event.target.value })}
          />
          <Input
            id="pause-ends-on"
            label="Al"
            type="date"
            min={pause.startsOn}
            value={pause.endsOn}
            onChange={(event) => changePause({ endsOn: event.target.value })}
          />
        </fieldset>

        {inlineError !== null ? (
          <p className="error" role="alert">
            {inlineError}
          </p>
        ) : null}

        {isPreviewShown ? (
          <p className="preview" role="status">
            {describePausePreview(subscription, pause)}
          </p>
        ) : null}

        {hasPauseEnded ? (
          <p className="warning">Una pausa già finita non si potrà togliere.</p>
        ) : null}

        <div className="actions">
          <Button
            type="submit"
            variant="secondary"
            loading={create.isPending}
            disabled={isEnded}
            aria-describedby={isEnded ? endedNoticeId : undefined}
          >
            Metti in pausa
          </Button>
        </div>
      </form>
    </section>
  );
}

function ActivePause({
  athleteId,
  activePause,
  isRefreshing,
  today,
  onChanged,
  onWriteError,
}: PauseSectionProps & { activePause: Pause }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // A pause that has not started is cancelled; a running one ends yesterday (contract R2).
  const isCancellable = activePause.startsOn >= today;

  const remove = useMutation({
    mutationFn: () => removeCoachClientPause(athleteId),
    fallback: REMOVE_ERROR,
    onSuccess: () => {
      toast.success(isCancellable ? "Pausa annullata" : "Pausa terminata");
      onChanged();
    },
    onError: (error) => onWriteError(error, REMOVE_ERROR),
  });

  const isScheduled = activePause.startsOn > today;
  const fromText = withDatePreposition("dal", activePause.startsOn);
  const toText = withDatePreposition("al", activePause.endsOn);
  const summary = isScheduled ? `Pausa programmata ${fromText} ${toText}` : `In pausa fino ${toText}`;
  const actionLabel = isCancellable ? "Annulla pausa" : "Termina pausa";
  const confirmMessage = isCancellable
    ? "La pausa viene annullata e «pagato fino al» torna com'era."
    : `La pausa finisce ieri (${formatLongDate(addRomeDays(today, -1))}). I giorni non goduti tornano indietro.`;

  const confirmRemove = () => {
    setIsConfirmOpen(false);
    remove.mutate();
  };

  return (
    <section className="pause-section" aria-labelledby="pause-section-title">
      <div className="intro">
        <h2 id="pause-section-title" className="title">
          Pausa
        </h2>
        <p className="summary">{summary}</p>
      </div>

      {activePause.canRemove ? (
        <div className="actions">
          <Button
            variant="secondary"
            loading={remove.isPending}
            disabled={isRefreshing}
            onClick={() => setIsConfirmOpen(true)}
          >
            {actionLabel}
          </Button>
        </div>
      ) : (
        <p className="hint">
          Non si può più togliere: dopo è stato registrato altro. Annulla prima l&apos;ultima
          operazione.
        </p>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={`${actionLabel}?`}
        message={confirmMessage}
        confirmLabel={actionLabel}
        cancelLabel="Indietro"
        onConfirm={confirmRemove}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </section>
  );
}

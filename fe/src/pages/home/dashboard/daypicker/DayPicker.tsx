import { Button } from "@components/button";
import type { ProgramDayOption } from "../types";
import "./style.css";

export type DayPickerProps = {
  isOpen: boolean;
  days: ProgramDayOption[];
  currentDayId: number | null;
  title?: string;
  currentLabel?: string;
  isSaving?: boolean;
  showReset?: boolean;
  onClose: () => void;
  onSelect: (workoutDayId: number) => void;
  onReset?: () => void;
};

export function DayPicker({
  isOpen,
  days,
  currentDayId,
  title = "Scegli il giorno di oggi",
  currentLabel = "Assegnato",
  isSaving = false,
  showReset = false,
  onClose,
  onSelect,
  onReset,
}: DayPickerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="day-picker-overlay" role="presentation" onClick={onClose}>
      <div
        className="day-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="header">
          <p className="eyebrow">Programma</p>
          <h2 id="day-picker-title" className="title">
            {title}
          </h2>
        </header>

        <ul className="list">
          {days.map((day) => {
            const isCurrent = day.id === currentDayId;

            return (
              <li key={day.id}>
                <button
                  type="button"
                  className={`option${isCurrent ? " current" : ""}`}
                  disabled={isSaving || isCurrent}
                  onClick={() => onSelect(day.id)}
                >
                  <span className="name">{day.name}</span>
                  {isCurrent ? <span className="badge">{currentLabel}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="footer">
          {showReset && onReset ? (
            <Button.Root
              variant="ghost"
              className="reset"
              disabled={isSaving}
              onClick={() => void onReset()}
            >
              <Button.Label>RIPRISTINA PROGRAMMA</Button.Label>
            </Button.Root>
          ) : null}

          <Button.Root variant="ghost" className="cancel" onClick={onClose} disabled={isSaving}>
            <Button.Label>ANNULLA</Button.Label>
          </Button.Root>
        </div>
      </div>
    </div>
  );
}

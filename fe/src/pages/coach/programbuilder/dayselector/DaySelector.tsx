import type { DraftWorkoutDay } from "../types";
import type { MoveDirection } from "../workoutForm";
import "./style.css";

export type DaySelectorProps = {
  days: DraftWorkoutDay[];
  activeDayId: string;
  onSelect: (dayClientId: string) => void;
  onAdd: () => void;
  onRemove: (dayClientId: string) => void;
  onMoveActive: (direction: MoveDirection) => void;
  onDuplicateActive: () => void;
};

export function DaySelector({
  days,
  activeDayId,
  onSelect,
  onAdd,
  onRemove,
  onMoveActive,
  onDuplicateActive,
}: DaySelectorProps) {
  const activeIndex = days.findIndex((day) => day.clientId === activeDayId);
  const isActiveFirst = activeIndex === 0;
  const isActiveLast = activeIndex === days.length - 1;

  return (
    <section className="day-selector" aria-labelledby="day-selector-title">
      <div className="header">
        <h2 id="day-selector-title" className="title">
          GIORNI
        </h2>
        <div className="day-actions">
          <button
            type="button"
            className="move-day"
            aria-label="Sposta il giorno selezionato prima"
            disabled={isActiveFirst}
            onClick={() => onMoveActive("earlier")}
          >
            ←
          </button>
          <button
            type="button"
            className="move-day"
            aria-label="Sposta il giorno selezionato dopo"
            disabled={isActiveLast}
            onClick={() => onMoveActive("later")}
          >
            →
          </button>
          <button type="button" className="add-day" onClick={onDuplicateActive}>
            Duplica
          </button>
          <button type="button" className="add-day" onClick={onAdd}>
            + Aggiungi
          </button>
        </div>
      </div>

      <div className="chips" role="tablist" aria-label="Giorni di allenamento">
        {days.map((day) => {
          const isActive = day.clientId === activeDayId;

          return (
            <div key={day.clientId} className="chip-wrap">
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={isActive ? "chip active" : "chip"}
                onClick={() => onSelect(day.clientId)}
              >
                {day.name.trim() || `Giorno ${day.sortOrder + 1}`}
              </button>

              {days.length > 1 ? (
                <button
                  type="button"
                  className="remove-day"
                  aria-label={`Rimuovi ${day.name}`}
                  onClick={() => onRemove(day.clientId)}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

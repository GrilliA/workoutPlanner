import type { DraftWorkoutDay } from "../types";
import "./style.css";

export type DaySelectorProps = {
  days: DraftWorkoutDay[];
  activeDayId: string;
  onSelect: (dayClientId: string) => void;
  onAdd: () => void;
  onRemove: (dayClientId: string) => void;
};

export function DaySelector({
  days,
  activeDayId,
  onSelect,
  onAdd,
  onRemove,
}: DaySelectorProps) {
  return (
    <section className="day-selector" aria-labelledby="day-selector-title">
      <div className="header">
        <h2 id="day-selector-title" className="title">
          GIORNI
        </h2>
        <button type="button" className="add-day" onClick={onAdd}>
          + Aggiungi
        </button>
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

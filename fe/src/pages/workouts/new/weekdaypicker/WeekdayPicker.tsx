import type { Weekday } from "@api/schemas/workoutday";
import { WEEKDAY_LABELS_SHORT } from "../types";
import "./style.css";

export type WeekdayPickerProps = {
  selected: Weekday[];
  taken: Weekday[];
  onToggle: (weekday: Weekday) => void;
};

export function WeekdayPicker({ selected, taken, onToggle }: WeekdayPickerProps) {
  return (
    <section className="weekday-picker" aria-labelledby="weekday-picker-title">
      <h2 id="weekday-picker-title" className="title">
        GIORNI SETTIMANA
      </h2>

      <div className="days" role="group" aria-label="Seleziona i giorni della settimana">
        {WEEKDAY_LABELS_SHORT.map((label, weekday) => {
          const isSelected = selected.includes(weekday as Weekday);
          const isTaken = taken.includes(weekday as Weekday);

          return (
            <button
              key={label}
              type="button"
              className={
                isSelected ? "day active" : isTaken ? "day taken" : "day"
              }
              disabled={isTaken}
              aria-pressed={isSelected}
              onClick={() => onToggle(weekday as Weekday)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

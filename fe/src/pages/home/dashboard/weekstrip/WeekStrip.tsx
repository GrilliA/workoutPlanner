import { Skeleton } from "@components/skeleton";
import type { WeekStripDay } from "../types";
import "./style.css";

export type WeekStripProps = {
  days: WeekStripDay[];
  isLoading?: boolean;
  onDaySelect?: (day: WeekStripDay) => void;
};

const truncateDayName = (name: string): string =>
  name.length > 8 ? `${name.slice(0, 7)}…` : name;

export function WeekStripSkeleton() {
  return (
    <div className="week-strip loading" aria-busy="true" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <Skeleton key={index} variant="block" width={48} height={56} className="day-skeleton" />
      ))}
    </div>
  );
}

export function WeekStrip({ days, isLoading = false, onDaySelect }: WeekStripProps) {
  if (isLoading) {
    return <WeekStripSkeleton />;
  }

  const isInteractive = Boolean(onDaySelect);

  return (
    <div className="week-strip" aria-label="Programma settimanale">
      {days.map((day) => {
        const className = [
          "day",
          day.isToday ? "today" : "",
          day.isRest ? "rest" : "scheduled",
          day.isOverride ? "override" : "",
          isInteractive ? "interactive" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const label = day.workoutDayName
          ? `${day.weekdayLabel} ${day.dayNumber}: ${day.workoutDayName}`
          : `${day.weekdayLabel} ${day.dayNumber}: riposo`;

        const content = (
          <>
            <span className="label">{day.weekdayLabel}</span>
            <span className="number">{day.dayNumber}</span>
            {day.workoutDayName ? (
              <span className="workout">{truncateDayName(day.workoutDayName)}</span>
            ) : (
              <span className="workout rest-label">Riposo</span>
            )}
          </>
        );

        if (!isInteractive) {
          return (
            <div
              key={day.dateKey}
              className={className}
              aria-current={day.isToday ? "date" : undefined}
              title={label}
            >
              {content}
            </div>
          );
        }

        return (
          <button
            key={day.dateKey}
            type="button"
            className={className}
            aria-current={day.isToday ? "date" : undefined}
            title={`${label} · Tocca per modificare`}
            onClick={() => onDaySelect?.(day)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

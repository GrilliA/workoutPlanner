import { Skeleton } from "@components/skeleton";
import type { WeekStripDay } from "../types";
import "./style.css";

export type WeekStripProps = {
  days: WeekStripDay[];
  isLoading?: boolean;
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

export function WeekStrip({ days, isLoading = false }: WeekStripProps) {
  if (isLoading) {
    return <WeekStripSkeleton />;
  }

  return (
    <div className="week-strip" aria-label="Programma settimanale">
      {days.map((day) => (
        <div
          key={day.dateKey}
          className={[
            "day",
            day.isToday ? "today" : "",
            day.isRest ? "rest" : "scheduled",
            day.isOverride ? "override" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-current={day.isToday ? "date" : undefined}
          title={
            day.workoutDayName
              ? `${day.weekdayLabel} ${day.dayNumber}: ${day.workoutDayName}`
              : `${day.weekdayLabel} ${day.dayNumber}: riposo`
          }
        >
          <span className="label">{day.weekdayLabel}</span>
          <span className="number">{day.dayNumber}</span>
          {day.workoutDayName ? (
            <span className="workout">{truncateDayName(day.workoutDayName)}</span>
          ) : (
            <span className="workout rest-label">Riposo</span>
          )}
        </div>
      ))}
    </div>
  );
}

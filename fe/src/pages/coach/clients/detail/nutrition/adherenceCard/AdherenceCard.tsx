import type { CSSProperties } from "react";
import type { MealDayAdherence } from "@api";
import { Skeleton } from "@components/skeleton";
import { cx } from "@utils/cx";
import { adherenceView } from "../mappers/adherence";
import "./style.css";

type AdherenceCardProps = {
  /** undefined while loading or after a failed read (already toasted). */
  days: MealDayAdherence[] | undefined;
  isPending: boolean;
  today: string;
};

const removedNote = (count: number): string => {
  const marks = count === 1 ? "1 segno" : `${count} segni`;
  return `${marks} su pasti non più nel piano: non contano nella percentuale.`;
};

export function AdherenceCard({ days, isPending, today }: AdherenceCardProps) {
  const view = days === undefined ? null : adherenceView(days, today);

  return (
    <section className="adherence-card" aria-labelledby="adherence-card-title">
      <h2 id="adherence-card-title" className="title">
        Aderenza, ultimi 7 giorni
      </h2>

      {isPending ? (
        <div role="status">
          <span className="sr-only">Caricamento…</span>
          <Skeleton height="2.5rem" width="6rem" />
          <Skeleton height="6rem" />
        </div>
      ) : null}

      {!isPending && view === null ? (
        <p className="unavailable">Aderenza non disponibile. Ricarica la pagina per riprovare.</p>
      ) : null}

      {view !== null ? (
        <>
          {view.percent === null ? (
            <p className="unavailable">Nessun pasto da contare in questi giorni.</p>
          ) : (
            <p className="percent">
              {view.percent}%<span className="percent-label"> dei pasti segnati come fatti</span>
            </p>
          )}
          <ol className="days">
            {view.days.map((day) => (
              <li key={day.date} className={cx("day", day.isToday && "day--today")}>
                <span
                  className="bar"
                  aria-hidden="true"
                  style={
                    {
                      "--done": `${day.donePercent}%`,
                      "--other": `${day.otherPercent}%`,
                    } as CSSProperties
                  }
                >
                  {day.donePercent > 0 ? <span className="segment segment--done" /> : null}
                  {day.otherPercent > 0 ? <span className="segment segment--other" /> : null}
                </span>
                <span className="weekday" aria-hidden="true">
                  {day.weekdayLabel}
                </span>
                <span className="sr-only">{day.description}</span>
              </li>
            ))}
          </ol>
          <ul className="legend">
            <li className="legend__item">
              <span className="swatch segment--done" aria-hidden="true" />
              Fatto
            </li>
            <li className="legend__item">
              <span className="swatch segment--other" aria-hidden="true" />
              Altro
            </li>
          </ul>
          {view.removedCount > 0 ? <p className="removed">{removedNote(view.removedCount)}</p> : null}
        </>
      ) : null}
    </section>
  );
}

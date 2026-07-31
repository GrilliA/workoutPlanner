import { Link } from "wouter";
import type { DashboardExpirationRow } from "../types";
import "./style.css";

type ExpirationRowProps = {
  row: DashboardExpirationRow;
};

export function ExpirationRow({ row }: ExpirationRowProps) {
  const schedaHref = `/clients/${row.athleteId}/programs/${row.workoutId}`;

  return (
    <article className={`expiration-row expiration-row--${row.kind}`}>
      <Link href={`/clients/${row.athleteId}`} className="expiration-row__main">
        <span className="expiration-row__name">{row.athleteLabel}</span>
        <span className="expiration-row__meta">{row.workoutName}</span>
        <span className="expiration-row__timing">{row.timingLabel}</span>
      </Link>
      <Link href={schedaHref} className="coach-link expiration-row__scheda">
        Scheda
      </Link>
    </article>
  );
}

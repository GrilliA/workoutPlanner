import { Link } from "wouter";
import type { AlertSignal, AlertTableRow } from "../types";
import "./style.css";

type AlertsTableProps = {
  rows: AlertTableRow[];
};

const countKind = (rows: AlertTableRow[], kind: AlertSignal["kind"]): number =>
  rows.filter((row) => row.signals.some((signal) => signal.kind === kind)).length;

const summaryLabel = (rows: AlertTableRow[]): string => {
  const inactive = countKind(rows, "inactive");
  const expiring = countKind(rows, "program_expiring");
  const parts: string[] = [];

  if (inactive > 0) {
    parts.push(`${inactive} ${inactive === 1 ? "inattivo" : "inattivi"}`);
  }

  if (expiring > 0) {
    parts.push(`${expiring} in scadenza`);
  }

  return parts.join(" · ");
};

const rowTone = (row: AlertTableRow): "expiring" | "inactive" =>
  row.signals.some((signal) => signal.kind === "program_expiring")
    ? "expiring"
    : "inactive";

const badgeTone = (kind: AlertSignal["kind"]): "expiring" | "inactive" =>
  kind === "program_expiring" ? "expiring" : "inactive";

export function AlertsTable({ rows }: AlertsTableProps) {
  const summary = summaryLabel(rows);

  return (
    <section className="analytics-alerts" aria-label="Clienti da controllare">
      <div className="analytics-alerts__header">
        <h2>Da controllare</h2>
        {summary ? <p className="analytics-alerts__summary">{summary}</p> : null}
      </div>

      {rows.length === 0 ? (
        <p className="analytics-alerts__empty">
          Nessun segnale critico. Continua a monitorare l&apos;attività del portafoglio.
        </p>
      ) : (
        <div className="analytics-alerts__table-wrap">
          <table className="analytics-alerts__table">
            <thead>
              <tr>
                <th scope="col">Atleta</th>
                <th scope="col">Segnali</th>
                <th scope="col">Sessioni</th>
                <th scope="col">Ultima sessione</th>
                <th scope="col">
                  <span className="sr-only">Azione</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.athleteId}
                  className={`analytics-alerts__row analytics-alerts__row--${rowTone(row)}`}
                >
                  <td data-label="Atleta">
                    <span className="analytics-alerts__athlete">
                      <span className="analytics-alerts__avatar" aria-hidden>
                        {row.athleteLabel.slice(0, 1).toUpperCase()}
                      </span>
                      {row.athleteLabel}
                    </span>
                  </td>
                  <td data-label="Segnali">
                    <ul className="analytics-alerts__signals">
                      {row.signals.map((signal) => (
                        <li key={signal.kind} className="analytics-alerts__signal">
                          <span
                            className={`analytics-alerts__badge analytics-alerts__badge--${badgeTone(signal.kind)}`}
                          >
                            {signal.label}
                          </span>
                          <span className="analytics-alerts__detail">{signal.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="Sessioni">{row.sessionsLabel}</td>
                  <td data-label="Ultima sessione">{row.lastSessionLabel}</td>
                  <td data-label="Azione">
                    <Link href={row.href} className="analytics-alerts__cta">
                      Apri cliente
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

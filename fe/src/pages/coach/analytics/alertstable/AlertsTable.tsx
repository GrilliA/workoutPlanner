import { Link } from "wouter";
import type { AlertTableRow } from "../types";
import "./style.css";

type AlertsTableProps = {
  rows: AlertTableRow[];
};

export function AlertsTable({ rows }: AlertsTableProps) {
  return (
    <section className="analytics-alerts" aria-label="Clienti da controllare">
      <h2>Da controllare</h2>

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
                <th scope="col">Motivo</th>
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
                  className={
                    row.severity === "high"
                      ? "analytics-alerts__row analytics-alerts__row--high"
                      : "analytics-alerts__row"
                  }
                >
                  <td data-label="Atleta">{row.athleteLabel}</td>
                  <td data-label="Motivo">
                    {row.reason}
                    {row.extraReasons > 0 ? (
                      <span className="analytics-alerts__extra">
                        {" "}
                        +{row.extraReasons} altri segnali
                      </span>
                    ) : null}
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

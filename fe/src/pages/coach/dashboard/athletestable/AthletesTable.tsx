import { Link } from "wouter";
import type { DashboardAthleteRow } from "../types";
import "./style.css";

type AthletesTableProps = {
  rows: DashboardAthleteRow[];
};

export function AthletesTable({ rows }: AthletesTableProps) {
  return (
    <section className="athletes-table" aria-labelledby="athletes-table-title">
      <div className="athletes-table__header">
        <h2 id="athletes-table-title">Gestione atleti</h2>
        <Link href="/clients" className="athletes-table__all">
          Vedi tutti
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="coach-empty">Nessun cliente collegato.</p>
      ) : (
        <div className="athletes-table__frame">
          <table className="athletes-table__table">
            <thead>
              <tr>
                <th scope="col">Atleta</th>
                <th scope="col">Stato programma</th>
                <th scope="col">Dettaglio</th>
                <th scope="col">
                  <span className="sr-only">Azione</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="athletes-table__row">
                  <td data-label="Atleta">
                    <Link href={`/clients/${row.id}`} className="athletes-table__name">
                      <span className="athletes-table__avatar" aria-hidden>
                        {row.label.slice(0, 1).toUpperCase()}
                      </span>
                      {row.label}
                    </Link>
                  </td>
                  <td data-label="Stato programma">
                    <span
                      className={`athletes-table__badge athletes-table__badge--${row.status}`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td data-label="Dettaglio" className="athletes-table__meta">
                    {row.metaLabel}
                  </td>
                  <td data-label="Azione" className="athletes-table__actions">
                    <Link href={`/clients/${row.id}`} className="coach-link">
                      Apri
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

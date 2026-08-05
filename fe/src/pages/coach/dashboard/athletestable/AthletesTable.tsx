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
        <p className="coach-empty">Nessun cliente ancora.</p>
      ) : (
        <div className="athletes-table__frame">
          <table>
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Stato programma</th>
                <th>Dettaglio</th>
                <th className="athletes-table__actions">Azione</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/clients/${row.id}`} className="athletes-table__name">
                      <span className="athletes-table__avatar" aria-hidden>
                        {row.label.slice(0, 1).toUpperCase()}
                      </span>
                      {row.label}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`athletes-table__badge athletes-table__badge--${row.status}`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="athletes-table__meta">{row.metaLabel}</td>
                  <td className="athletes-table__actions">
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

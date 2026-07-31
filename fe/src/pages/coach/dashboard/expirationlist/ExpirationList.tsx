import type { DashboardExpirationRow } from "../types";
import { ExpirationRow } from "./ExpirationRow";
import "./style.css";

type ExpirationListProps = {
  upcoming: DashboardExpirationRow[];
  expired: DashboardExpirationRow[];
};

function Section({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: DashboardExpirationRow[];
  emptyLabel: string;
}) {
  return (
    <section className="expiration-list__section">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="coach-empty">{emptyLabel}</p>
      ) : (
        <div className="expiration-list__rows">
          {rows.map((row) => (
            <ExpirationRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ExpirationList({ upcoming, expired }: ExpirationListProps) {
  return (
    <div className="expiration-list">
      <Section
        title="In scadenza (≤30gg)"
        rows={upcoming}
        emptyLabel="Nessuna scheda in scadenza nei prossimi 30 giorni"
      />
      <Section
        title="Scadute da rinnovare"
        rows={expired}
        emptyLabel="Nessuna scheda scaduta da rinnovare"
      />
    </div>
  );
}

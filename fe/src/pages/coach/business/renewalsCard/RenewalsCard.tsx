import type { RenewalsSummary } from "../types";
import "./style.css";

type RenewalsCardProps = {
  summary: RenewalsSummary;
};

export function RenewalsCard({ summary }: RenewalsCardProps) {
  return (
    <section className="business-renewals" aria-labelledby="business-renewals-title">
      <h2 id="business-renewals-title">Rinnovi</h2>
      {summary.value === null ? null : <p className="value">{summary.value}</p>}
      <p className="hint">{summary.hint}</p>
      <p className="note">
        Conta ogni cliente una volta: ha rinnovato se hai segnato un rinnovo negli ultimi 90 giorni e
        oggi non è scaduto.
      </p>
    </section>
  );
}

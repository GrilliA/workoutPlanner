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
      <p className="note">Una scadenza conta come rinnovata quando segni il pagamento del periodo dopo.</p>
    </section>
  );
}

import { Link } from "wouter";
import { PageHeader } from "@components/pageHeader";
import { useCoachBusiness } from "../api/useCoachBusiness";
import { BusinessSkeleton } from "../businessSkeleton";
import { CollectedChart } from "../collectedChart";
import { KpiTiles } from "../kpiTiles";
import { LostCard } from "../lostCard";
import { RangeFilter } from "../rangeFilter";
import { RenewalsCard } from "../renewalsCard";
import "../../style.css";
import "./style.css";

export function BusinessPage() {
  const { view, isLoading, range, setRange } = useCoachBusiness();
  const isEmpty = view !== undefined && view.isEmpty;
  const hasNumbers = view !== undefined && !view.isEmpty;

  return (
    <div className="business-page coach-page page-container page-container--wide">
      <PageHeader title="Business" subtitle="Entrate, incassi e clienti dal registro pagamenti" />

      {view === undefined && isLoading ? <BusinessSkeleton /> : null}

      {isEmpty ? (
        <section className="coach-dashboard__empty">
          <h2>Ancora nessun abbonamento</h2>
          <p className="coach-empty">
            I numeri arrivano dal registro: crea l&apos;abbonamento di un cliente e segna i suoi
            pagamenti.
          </p>
          <div className="coach-dashboard__actions">
            <Link href="/clients" className="coach-btn-link coach-btn-link--primary">
              Vai ai clienti
            </Link>
            <Link href="/settings/offers" className="coach-link">
              Prepara il listino
            </Link>
          </div>
        </section>
      ) : null}

      {hasNumbers ? (
        <>
          <RangeFilter value={range} onChange={setRange} />
          <KpiTiles items={view.kpis} />
          <CollectedChart model={view.chart} />
          <div className="cards">
            <RenewalsCard summary={view.renewals} />
            <LostCard summary={view.lost} />
          </div>
        </>
      ) : null}
    </div>
  );
}

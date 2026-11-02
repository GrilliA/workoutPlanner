import { Link, useSearchParams } from "wouter";
import { getCoachClients, useQuery } from "@api";
import { PageHeader } from "@components/pageHeader";
import { todayInRome } from "@utils/romeCalendar";
import { CoachCardListSkeleton } from "../coachCard";
import { ClientFilters } from "./clientFilters";
import { ClientTable } from "./clientTable";
import {
  CLIENT_FILTER_OPTIONS,
  clientFilterFromSearch,
  filterClients,
  searchForClientFilter,
  type ClientFilter,
} from "./mappers/clientList";
import "../style.css";

export default function CoachClientsPage() {
  const { data, isPending } = useQuery({
    queryFn: getCoachClients,
    fallback: "Impossibile caricare i clienti",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const clients = data ?? [];
  const filter = clientFilterFromSearch(searchParams.get("stato"));
  const visibleClients = filterClients(clients, filter);
  const filterLabel = CLIENT_FILTER_OPTIONS[filter].label;
  const hasClients = !isPending && clients.length > 0;
  const isFilterEmpty = hasClients && visibleClients.length === 0;
  const emptyFilterMessage = `Nessun cliente nel filtro “${filterLabel}”.`;
  const countMessage = visibleClients.length === 1 ? "1 cliente" : `${visibleClients.length} clienti`;
  const resultMessage = isFilterEmpty ? emptyFilterMessage : countMessage;

  // `replace`: switching filter should not fill the browser history.
  function changeFilter(nextFilter: ClientFilter) {
    setSearchParams(searchForClientFilter(nextFilter), { replace: true });
  }

  return (
    <div className="coach-page page-container page-container--wide">
      <PageHeader
        title="Clienti"
        subtitle="Atleti collegati al tuo account"
        action={
          <Link href="/clients/new" className="coach-btn-link coach-btn-link--primary">
            Invita cliente
          </Link>
        }
      />

      {isPending ? (
        <CoachCardListSkeleton />
      ) : null}

      {!isPending && clients.length === 0 ? (
        <section className="coach-dashboard__empty">
          <h2>Invita il primo cliente</h2>
          <p className="coach-empty">
            Condividi il codice invito: l&apos;atleta si registra sull&apos;app e si collega a te.
          </p>
          <div className="coach-dashboard__actions">
            <Link
              href="/clients/new"
              className="coach-btn-link coach-btn-link--primary"
            >
              Invita cliente
            </Link>
          </div>
        </section>
      ) : null}

      {hasClients ? <ClientFilters value={filter} onChange={changeFilter} /> : null}

      {/* Always mounted: screen readers skip a live region that appears already filled. */}
      <p className="sr-only" role="status">
        {hasClients ? resultMessage : ""}
      </p>

      {isFilterEmpty ? <p className="coach-empty">{emptyFilterMessage}</p> : null}

      {hasClients && !isFilterEmpty ? (
        <ClientTable caption={`Clienti: ${filterLabel}`} clients={visibleClients} today={todayInRome()} />
      ) : null}
    </div>
  );
}

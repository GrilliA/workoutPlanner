import { Link } from "wouter";
import { PageError } from "@components/pageError";
import { PageHeader } from "@components/pageHeader";
import { CoachCard, CoachCardList } from "../coachCard";
import { useClients } from "./api/useClients";
import "../style.css";

export default function CoachClientsPage() {
  const { clients, loading, error, retry } = useClients();

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

      {error ? <PageError message={error} onRetry={retry} /> : null}

      {!error && loading ? (
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!error && !loading && clients.length === 0 ? (
        <p className="coach-empty">Nessun cliente ancora. Creane uno per iniziare.</p>
      ) : null}

      {!error && !loading && clients.length > 0 ? (
        <CoachCardList>
          {clients.map((client) => (
            <CoachCard
              key={client.id}
              href={`/clients/${client.id}`}
              title={client.name ?? client.email}
              subtitle={client.email}
            />
          ))}
        </CoachCardList>
      ) : null}
    </div>
  );
}

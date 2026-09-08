import { Link } from "wouter";
import { getCoachClients, useQuery } from "@api";
import { PageHeader } from "@components/pageHeader";
import { CoachCard, CoachCardList } from "../coachCard";
import "../style.css";

export default function CoachClientsPage() {
  const { data, isPending } = useQuery({
    queryFn: getCoachClients,
    fallback: "Impossibile caricare i clienti",
  });
  const clients = data ?? [];

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
        <p className="coach-empty">Caricamento…</p>
      ) : null}

      {!isPending && clients.length === 0 ? (
        <p className="coach-empty">Nessun cliente ancora. Creane uno per iniziare.</p>
      ) : null}

      {!isPending && clients.length > 0 ? (
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

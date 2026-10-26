import { Link } from "wouter";
import type { CoachClientListItem } from "@api";
import { formatShortDate, withDatePreposition } from "@utils/romeCalendar";
import { formatClientStatus, formatTrainingFrequency } from "../mappers/clientList";
import "./style.css";

type ClientTableProps = {
  caption: string;
  clients: CoachClientListItem[];
  today: string;
};

export function ClientTable({ caption, clients, today }: ClientTableProps) {
  return (
    <div className="client-table">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Stato</th>
            <th scope="col">Pagato fino al</th>
            <th scope="col">Ultimi 14 giorni</th>
            <th scope="col">Ultima sessione</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const { subscription, lastSessionOn } = client;
            const statusTone = subscription?.status ?? "none";
            // A closed subscription is set up again like a missing one: its date is not a coverage.
            const hasPaidThrough = subscription !== null && subscription.status !== "ended";
            const paidThrough = hasPaidThrough ? formatShortDate(subscription.paidThrough, today) : "—";
            const pausedUntil = subscription?.pausedUntil ?? null;
            const lastSession = lastSessionOn === null ? "Nessuna" : formatShortDate(lastSessionOn, today);

            return (
              <tr key={client.id}>
                <th scope="row" className="client">
                  <Link href={`/clients/${client.id}`} className="name">
                    {client.name ?? client.email}
                  </Link>
                  {client.name !== null ? <span className="email">{client.email}</span> : null}
                </th>
                <td data-label="Stato">
                  <span className={`status status--${statusTone}`}>{formatClientStatus(subscription)}</span>
                  {pausedUntil !== null ? (
                    <span className="status-until">
                      fino {withDatePreposition("al", pausedUntil, (dateKey) => formatShortDate(dateKey, today))}
                    </span>
                  ) : null}
                </td>
                <td data-label="Pagato fino al" className="number">
                  {paidThrough}
                </td>
                <td data-label="Ultimi 14 giorni" className="number">
                  {formatTrainingFrequency(client.last14Days)}
                </td>
                <td data-label="Ultima sessione">{lastSession}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

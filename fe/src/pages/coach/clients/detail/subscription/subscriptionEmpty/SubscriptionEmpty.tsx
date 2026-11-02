import { Link } from "wouter";
import { Button } from "@components/button";
import "./style.css";

type SubscriptionEmptyProps = {
  clientName: string;
  /** false once the price list loaded with no active offer; true while unknown. */
  hasActiveOffers: boolean;
  onCreate: () => void;
};

export function SubscriptionEmpty({ clientName, hasActiveOffers, onCreate }: SubscriptionEmptyProps) {
  return (
    <section className="subscription-empty" aria-labelledby="subscription-empty-title">
      <h2 id="subscription-empty-title" className="title">
        Nessun abbonamento
      </h2>
      <p className="message">
        {clientName} non ha ancora un abbonamento. Scegli un&apos;offerta per tenere traccia dei
        pagamenti.
      </p>
      {hasActiveOffers ? (
        <Button variant="primary" onClick={onCreate}>
          Crea abbonamento
        </Button>
      ) : (
        <Link href="/settings/offers" className="offers-link">
          Crea prima un&apos;offerta nel listino
        </Link>
      )}
    </section>
  );
}

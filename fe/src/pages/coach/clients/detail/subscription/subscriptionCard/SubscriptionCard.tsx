import type { Offer, Payment, SubscriptionDetail } from "@api";
import { formatEveryPeriod, formatRenewalSchedule } from "@utils/billingPeriod";
import { formatEuros } from "@utils/money";
import { formatLongDate } from "@utils/romeCalendar";
import {
  formatDaysLeft,
  formatMonthCount,
  formatOfferName,
  formatSubscriptionStatus,
  monthsSince,
  totalPaidCents,
} from "../mappers/subscriptionSummary";
import "./style.css";

type SubscriptionCardProps = {
  detail: SubscriptionDetail;
  /** undefined when the price list did not load. */
  offers: Offer[] | undefined;
  /** undefined when the payments did not load: the total is left out. */
  payments: Payment[] | undefined;
  today: string;
  onEdit: () => void;
};

export function SubscriptionCard({ detail, offers, payments, today, onEdit }: SubscriptionCardProps) {
  const { subscription, state } = detail;
  const listOffer = offers?.find((offer) => offer.id === subscription.offerId);
  const agreedPrice = `${formatEuros(subscription.agreedPriceCents)} ${formatEveryPeriod(subscription)}`;
  const clientMonths = formatMonthCount(monthsSince(subscription.startedOn, today));
  const clientSince =
    payments === undefined
      ? clientMonths
      : `${clientMonths} · ${formatEuros(totalPaidCents(payments))} in tutto`;

  return (
    <section className="subscription-card" aria-labelledby="subscription-card-title">
      <div className="head">
        <h2 id="subscription-card-title" className="title">
          Abbonamento
        </h2>
        <button type="button" className="edit" onClick={onEdit}>
          Modifica
        </button>
      </div>

      <div className="paid-through">
        <span className="label">Pagato fino al</span>
        <span className="date">{formatLongDate(subscription.paidThrough)}</span>
        <span className="days-left">{formatDaysLeft(state.daysLeft)}</span>
        <span className={`status status--${state.status}`}>{formatSubscriptionStatus(state)}</span>
      </div>

      <dl className="terms">
        <div className="term">
          <dt>Offerta</dt>
          <dd>{formatOfferName(subscription.offerId, offers)}</dd>
        </div>
        <div className="term">
          <dt>Prezzo concordato</dt>
          <dd className="number">{agreedPrice}</dd>
          {listOffer !== undefined ? (
            <dd className="secondary">listino {formatEuros(listOffer.priceCents)}</dd>
          ) : null}
        </div>
        <div className="term">
          <dt>Rinnovo</dt>
          <dd>{formatRenewalSchedule(subscription)}</dd>
        </div>
        <div className="term">
          <dt>Cliente dal</dt>
          <dd>{formatLongDate(subscription.startedOn)}</dd>
          <dd className="secondary">{clientSince}</dd>
        </div>
      </dl>
    </section>
  );
}

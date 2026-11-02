import type { Offer } from "@api";
import { formatDuration, formatRenewalKind } from "@utils/billingPeriod";
import { formatEuros } from "@utils/money";
import "./style.css";

type OfferTableProps = {
  caption: string;
  offers: Offer[];
  editingOfferId: number | undefined;
  /** The offer whose archive toggle is in flight; every toggle waits for it. */
  togglingOfferId: number | undefined;
  onEdit: (offer: Offer) => void;
  onToggleArchive: (offer: Offer) => void;
};

export function OfferTable({
  caption,
  offers,
  editingOfferId,
  togglingOfferId,
  onEdit,
  onToggleArchive,
}: OfferTableProps) {
  const isArchiving = togglingOfferId !== undefined;

  return (
    <div className="offer-table">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Offerta</th>
            <th scope="col">Prezzo</th>
            <th scope="col">Durata</th>
            <th scope="col">Rinnovo</th>
            <th scope="col">
              <span className="sr-only">Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => {
            const isArchived = offer.archivedAt !== null;
            const toggleLabel = isArchived ? "Ripristina" : "Archivia";
            const isToggling = togglingOfferId === offer.id;

            return (
              <tr key={offer.id}>
                <th scope="row" className="name">
                  {offer.name}
                </th>
                <td data-label="Prezzo" className="number">
                  {formatEuros(offer.priceCents)}
                </td>
                <td data-label="Durata">{formatDuration(offer)}</td>
                <td data-label="Rinnovo">{formatRenewalKind(offer.isRecurring)}</td>
                <td className="actions">
                  <button
                    type="button"
                    className="action"
                    onClick={() => onEdit(offer)}
                    disabled={editingOfferId === offer.id}
                    aria-label={`Modifica ${offer.name}`}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="action"
                    onClick={() => onToggleArchive(offer)}
                    disabled={isArchiving}
                    aria-busy={isToggling || undefined}
                    aria-label={`${toggleLabel} ${offer.name}`}
                  >
                    {isToggling ? `${toggleLabel}…` : toggleLabel}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from "react";
import { ApiError, getCoachOffers, updateCoachOffer, useMutation, useQuery, type Offer } from "@api";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { SettingsTabs } from "../../settingsTabs";
import { OfferForm } from "../offerForm";
import { OfferTable } from "../offerTable";
import "./style.css";

const LOAD_ERROR = "Impossibile caricare il listino";
const ARCHIVE_ERROR = "Impossibile aggiornare l'offerta";

export function OffersSettings() {
  // Every write reloads the list, so the order stays the one of the API.
  const [reloadCount, setReloadCount] = useState(0);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const { data: offers } = useQuery({
    queryKey: [reloadCount],
    queryFn: ({ signal }) => getCoachOffers({ signal }),
    fallback: LOAD_ERROR,
    keepPreviousData: true,
  });

  const reload = () => setReloadCount((count) => count + 1);

  const reportWriteError = (error: ApiError, fallback: string) => {
    toast.error(ApiError.messageFrom(error, fallback));

    if (error.status === 404) {
      setEditingOffer(null);
      reload();
    }
  };

  const toggleArchive = useMutation({
    mutationFn: (offer: Offer) =>
      updateCoachOffer(offer.id, { archived: offer.archivedAt === null }),
    fallback: ARCHIVE_ERROR,
    onSuccess: (updated) => {
      const message = updated.archivedAt === null ? "Offerta ripristinata" : "Offerta archiviata";
      toast.success(message);
      reload();
    },
    onError: (error) => reportWriteError(error, ARCHIVE_ERROR),
  });

  const handleSaved = () => {
    setEditingOffer(null);
    reload();
  };

  const togglingOfferId = toggleArchive.isPending ? toggleArchive.variables?.id : undefined;
  const activeOffers = (offers ?? []).filter((offer) => offer.archivedAt === null);
  const archivedOffers = (offers ?? []).filter((offer) => offer.archivedAt !== null);
  const tableProps = {
    editingOfferId: editingOffer?.id,
    togglingOfferId,
    onEdit: setEditingOffer,
    onToggleArchive: toggleArchive.mutate,
  };

  return (
    <div className="offers-settings page-container">
      <header className="header">
        <p className="eyebrow">Impostazioni</p>
        <h1 className="title">Listino</h1>
      </header>

      <SettingsTabs activeTab="offers" />

      <section className="offers" aria-labelledby="offers-title">
        <div className="offers-intro">
          <h2 id="offers-title" className="section-title">
            Le tue offerte
          </h2>
          <p className="note">
            Se cambi un prezzo vale per i nuovi abbonamenti. Chi è già cliente mantiene il prezzo
            concordato.
          </p>
        </div>

        {offers === undefined ? (
          <div className="offers-skeleton" role="status">
            <span className="sr-only">Caricamento…</span>
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : null}

        {offers !== undefined && offers.length === 0 ? (
          <p className="empty">Nessuna offerta. Crea la prima per poter assegnare un abbonamento.</p>
        ) : null}

        {activeOffers.length > 0 ? (
          <OfferTable caption="Offerte attive" offers={activeOffers} {...tableProps} />
        ) : null}

        {archivedOffers.length > 0 ? (
          <div className="archived">
            <h3 className="archived-title">Archiviate</h3>
            <OfferTable caption="Offerte archiviate" offers={archivedOffers} {...tableProps} />
          </div>
        ) : null}
      </section>

      <OfferForm
        key={editingOffer?.id ?? "new"}
        offer={editingOffer}
        onSaved={handleSaved}
        onCancel={() => setEditingOffer(null)}
        onWriteError={reportWriteError}
      />
    </div>
  );
}

import { useState } from "react";
import {
  ApiError,
  type Offer,
  type Pause,
  type Subscription,
  type SubscriptionDetail,
} from "@api";
import { Button } from "@components/button";
import { PageHeader } from "@components/pageHeader";
import { Skeleton } from "@components/skeleton";
import { toast } from "@components/toast";
import { formatEveryPeriod } from "@utils/billingPeriod";
import { formatEuros } from "@utils/money";
import { todayInRome, withDatePreposition } from "@utils/romeCalendar";
import { useClientDetail } from "../../api/useClientDetail";
import { ClientTabs } from "../../clientTabs";
import { useClientSubscription } from "../api/useClientSubscription";
import { SubscriptionEnd } from "../subscriptionEnd";
import { formatOfferName } from "../mappers/subscriptionSummary";
import { lastPaymentMethod } from "../mappers/paymentForm";
import { PauseSection } from "../pauseSection";
import { PaymentDialog } from "../paymentDialog";
import { PaymentHistory } from "../paymentHistory";
import { SubscriptionCard } from "../subscriptionCard";
import { SubscriptionEmpty } from "../subscriptionEmpty";
import { SubscriptionForm } from "../subscriptionForm";
import "./style.css";

const ENDED_NOTICE_ID = "subscription-ended-notice";

type SubscriptionTabProps = {
  athleteId: number;
};

export function SubscriptionTab({ athleteId }: SubscriptionTabProps) {
  const today = todayInRome();
  const { detail: clientDetail, loading: isClientLoading } = useClientDetail(athleteId);
  const {
    clientSubscription,
    isSubscriptionRefreshing,
    payments,
    isPaymentsPending,
    isPaymentsRefreshing,
    offers,
    reload,
    showSavedDetail,
  } = useClientSubscription(athleteId);
  // Which form replaces the card or the empty state; a 409 on creation reloads into the card.
  const [openForm, setOpenForm] = useState<"create" | "edit" | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const client = clientDetail?.client ?? null;
  const clientName = client?.name ?? client?.email ?? "Cliente";
  const isLoading = isClientLoading || clientSubscription === undefined;
  const isNotFound = !isLoading && (client === null || clientSubscription === null);
  const loadedSubscription = isNotFound ? null : (clientSubscription ?? null);
  // Without a subscription the API answers with all three fields null.
  const detail = loadedSubscription?.subscription === null ? null : loadedSubscription;
  const isEnded = detail?.state.status === "ended";
  const hasNoSubscription = !isLoading && !isNotFound && detail === null;

  // 404 and 409 mean the data on screen is stale: someone else changed it (AC37).
  const reportWriteError = (error: ApiError, fallback: string) => {
    toast.error(ApiError.messageFrom(error, fallback));

    if (error.status === 404 || error.status === 409) {
      reload();
    }
  };

  const closeForm = () => setOpenForm(null);

  const handleSaved = (savedDetail: SubscriptionDetail) => {
    setOpenForm(null);
    showSavedDetail(savedDetail);
  };

  // The answers of a payment and a pause carry the subscription, not its state: the reload
  // that follows brings the rest.
  const handlePaymentRecorded = (subscription: Subscription) => {
    setIsPaymentOpen(false);
    toast.success(
      `Pagamento registrato · pagato fino ${withDatePreposition("al", subscription.paidThrough)}`,
    );

    if (detail === null) {
      reload();
      return;
    }

    showSavedDetail({ ...detail, subscription });
  };

  const handlePauseCreated = (created: { pause: Pause; subscription: Subscription }) => {
    if (detail === null) {
      reload();
      return;
    }

    showSavedDetail({ ...detail, subscription: created.subscription, activePause: created.pause });
  };

  const recordPaymentButton =
    detail === null ? undefined : (
      <Button
        variant="primary"
        disabled={isEnded}
        aria-describedby={isEnded ? ENDED_NOTICE_ID : undefined}
        onClick={() => setIsPaymentOpen(true)}
      >
        Registra pagamento
      </Button>
    );

  const hasActiveOffers = offers === undefined || offers.some((offer) => offer.archivedAt === null);

  return (
    <div className="subscription-tab coach-page page-container page-container--wide">
      <PageHeader title={clientName} subtitle={client?.email} action={recordPaymentButton} />

      <ClientTabs athleteId={athleteId} activeTab="subscription" />

      {isLoading ? (
        <div className="loading" role="status">
          <span className="sr-only">Caricamento…</span>
          <Skeleton height="12rem" />
          <Skeleton height="8rem" />
        </div>
      ) : null}

      {isNotFound ? <p className="coach-empty">Cliente non trovato</p> : null}

      {hasNoSubscription && openForm !== "create" ? (
        <SubscriptionEmpty
          clientName={clientName}
          hasActiveOffers={hasActiveOffers}
          onCreate={() => setOpenForm("create")}
        />
      ) : null}

      {hasNoSubscription && openForm === "create" ? (
        <SubscriptionForm
          athleteId={athleteId}
          offers={offers}
          saved={null}
          payments={payments}
          activePause={null}
          today={today}
          onSaved={handleSaved}
          onCancel={closeForm}
          onWriteError={reportWriteError}
        />
      ) : null}

      {detail !== null ? (
        <div className="content">
          {isEnded ? (
            <p className="ended-notice" id={ENDED_NOTICE_ID}>
              Abbonamento chiuso: riprendilo per registrare pagamenti o pause
            </p>
          ) : null}

          <div className="overview">
            <div className="column">
              {openForm === "edit" ? (
                <SubscriptionForm
                  athleteId={athleteId}
                  offers={offers}
                  saved={detail.subscription}
                  payments={payments}
                  activePause={detail.activePause}
                  today={today}
                  onSaved={handleSaved}
                  onCancel={closeForm}
                  onWriteError={reportWriteError}
                />
              ) : (
                <SubscriptionCard
                  detail={detail}
                  offers={offers}
                  payments={payments}
                  today={today}
                  onEdit={() => setOpenForm("edit")}
                />
              )}
            </div>

            <PauseSection
              key={detail.activePause?.id ?? "none"}
              athleteId={athleteId}
              subscription={detail.subscription}
              activePause={detail.activePause}
              isEnded={isEnded}
              endedNoticeId={ENDED_NOTICE_ID}
              isRefreshing={isSubscriptionRefreshing}
              today={today}
              onPauseCreated={handlePauseCreated}
              onChanged={reload}
              onWriteError={reportWriteError}
            />
          </div>

          <PaymentHistory
            athleteId={athleteId}
            payments={payments}
            isLoading={isPaymentsPending}
            isEnded={isEnded}
            isRefreshing={isPaymentsRefreshing}
            today={today}
            onChanged={reload}
            onWriteError={reportWriteError}
          />

          <SubscriptionEnd
            key={detail.subscription.endedOn ?? "open"}
            athleteId={athleteId}
            subscription={detail.subscription}
            today={today}
            onSaved={showSavedDetail}
            onWriteError={reportWriteError}
          />
        </div>
      ) : null}

      {isPaymentOpen && detail !== null && !isEnded ? (
        <PaymentDialog
          athleteId={athleteId}
          subtitle={paymentSubtitle(clientName, detail, offers)}
          subscription={detail.subscription}
          activePause={detail.activePause}
          defaultMethod={lastPaymentMethod(payments)}
          today={today}
          onRecorded={handlePaymentRecorded}
          onClose={() => setIsPaymentOpen(false)}
          onWriteError={reportWriteError}
        />
      ) : null}
    </div>
  );
}

/** "<Nome> · <Offerta> · <prezzo> ogni <durata>". */
function paymentSubtitle(
  clientName: string,
  detail: SubscriptionDetail,
  offers: Offer[] | undefined,
): string {
  const offerName = formatOfferName(detail.subscription.offerId, offers);
  const price = `${formatEuros(detail.subscription.agreedPriceCents)} ${formatEveryPeriod(detail.subscription)}`;

  return `${clientName} · ${offerName} · ${price}`;
}

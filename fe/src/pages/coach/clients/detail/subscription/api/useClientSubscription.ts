import { useState } from "react";
import {
  ApiError,
  getCoachClientPayments,
  getCoachClientSubscription,
  getCoachOffers,
  useQuery,
  type SubscriptionDetail,
} from "@api";
import { toast } from "@components/toast";

const PAYMENTS_ERROR = "Impossibile caricare i pagamenti";
const OFFERS_ERROR = "Impossibile caricare il listino";

/**
 * The three reads of the subscription tab, started together. The subscription is the page
 * read (a failure shows the page error, a 404 means the client is not found); payments and
 * offers are sections that only toast. `reload` refreshes all three after a write.
 *
 * Each read remembers which reload it answers: until the latest one arrives, `canUndo` and
 * `canRemove` on screen may be stale, so the undo buttons wait for it.
 */
export function useClientSubscription(athleteId: number) {
  const [reloadCount, setReloadCount] = useState(0);

  const subscription = useQuery({
    queryKey: [athleteId, reloadCount],
    queryFn: async ({ signal }) => {
      try {
        const clientSubscription = await getCoachClientSubscription(athleteId, { signal });
        return { clientSubscription, reloadCount };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { clientSubscription: null, reloadCount };
        }

        throw error;
      }
    },
    fallback: "Impossibile caricare l'abbonamento",
    keepPreviousData: true,
  });

  const payments = useQuery({
    queryKey: [athleteId, reloadCount],
    queryFn: async ({ signal }) => {
      const loadedPayments = await getCoachClientPayments(athleteId, { signal });
      return { payments: loadedPayments, reloadCount };
    },
    fallback: PAYMENTS_ERROR,
    throwOnError: false,
    keepPreviousData: true,
    onError: (error) => {
      // A missing client is already shown by the subscription read.
      if (error.status === 404) {
        return;
      }

      toast.error(ApiError.messageFrom(error, PAYMENTS_ERROR));
    },
  });

  const offers = useQuery({
    queryKey: [athleteId, reloadCount],
    queryFn: ({ signal }) => getCoachOffers({ signal }),
    fallback: OFFERS_ERROR,
    throwOnError: false,
    keepPreviousData: true,
    onError: (error) => {
      toast.error(ApiError.messageFrom(error, OFFERS_ERROR));
    },
  });

  const reload = () => setReloadCount((count) => count + 1);

  /** Shows what a write answered right away, then reloads what it did not return. */
  const showSavedDetail = (detail: SubscriptionDetail) => {
    subscription.setData({ clientSubscription: detail, reloadCount });
    reload();
  };

  return {
    /** undefined while loading, null when the client is not found. */
    clientSubscription: subscription.data?.clientSubscription,
    isSubscriptionRefreshing: subscription.data?.reloadCount !== reloadCount,
    payments: payments.data?.payments,
    isPaymentsPending: payments.isPending,
    isPaymentsRefreshing: payments.data?.reloadCount !== reloadCount,
    offers: offers.data,
    reload,
    showSavedDetail,
  };
}

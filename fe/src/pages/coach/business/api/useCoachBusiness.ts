import { useState } from "react";
import { ApiError, getCoachBusiness, useQuery, type BusinessRange } from "@api";
import { toast } from "@components/toast";
import { mapCoachBusiness } from "../mappers/business";
import { rangeFilterState, type RangeRequest } from "./rangeRequest";

const LOAD_ERROR = "Impossibile caricare i numeri business";

/**
 * The page read of Business and its range. The first failed read shows the page error;
 * a failed range change keeps the numbers on screen, puts the filter back on their range
 * and toasts.
 */
export function useCoachBusiness() {
  const [requested, setRequested] = useState<RangeRequest>({ range: "6m", id: 0 });
  const [failedRequestId, setFailedRequestId] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: [requested.id],
    queryFn: async ({ signal }) => {
      const business = await getCoachBusiness(requested.range, { signal });
      // The range the server answered for, not the one asked: the filter follows the numbers.
      return { view: mapCoachBusiness(business), loaded: { range: business.range, id: requested.id } };
    },
    fallback: LOAD_ERROR,
    keepPreviousData: true,
    throwOnError: (_error, current) => current === undefined,
    onError: (error) => {
      setFailedRequestId(requested.id);
      toast.error(ApiError.messageFrom(error, LOAD_ERROR));
    },
  });

  const { selectedRange, isRefreshing } = rangeFilterState({
    requested,
    loaded: data?.loaded,
    failedRequestId,
  });

  const selectRange = (range: BusinessRange) => {
    if (range === selectedRange) {
      return;
    }

    setRequested((current) => ({ range, id: current.id + 1 }));
  };

  return { view: data?.view, range: selectedRange, isRefreshing, selectRange };
}

import { useState } from "react";
import { ApiError, getCoachBusiness, useQuery, type BusinessRange } from "@api";
import { toast } from "@components/toast";
import { mapCoachBusiness } from "../mappers/business";

const LOAD_ERROR = "Impossibile caricare i numeri business";

/**
 * The page read of Business and its range. The first failed read shows the page error;
 * a failed range change keeps the numbers on screen and toasts.
 */
export function useCoachBusiness() {
  const [range, setRange] = useState<BusinessRange>("6m");
  const { data, isPending } = useQuery({
    queryKey: [range],
    queryFn: async ({ signal }) => mapCoachBusiness(await getCoachBusiness(range, { signal })),
    fallback: LOAD_ERROR,
    keepPreviousData: true,
    throwOnError: (_error, current) => current === undefined,
    onError: (error) => {
      toast.error(ApiError.messageFrom(error, LOAD_ERROR));
    },
  });

  return { view: data, isLoading: isPending, range, setRange };
}

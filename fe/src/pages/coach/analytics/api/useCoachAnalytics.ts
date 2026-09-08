import { useState } from "react";
import {
  ApiError,
  getCoachAnalyticsOverview,
  useQuery,
  type StatsRange,
} from "@api";
import { toast } from "@components/toast";
import { mapCoachAnalytics } from "../mappers/mapCoachAnalytics";

export function useCoachAnalytics(initialRange: StatsRange = "4w") {
  const [range, setRange] = useState(initialRange);
  const { data, isPending } = useQuery({
    queryKey: [range],
    queryFn: async ({ signal }) =>
      mapCoachAnalytics(await getCoachAnalyticsOverview(range, { signal })),
    fallback: "Impossibile caricare le analisi",
    keepPreviousData: true,
    throwOnError: (_error, current) => current === undefined,
    onError: (error) => {
      toast.error(ApiError.messageFrom(error, "Impossibile caricare le analisi"));
    },
  });

  const handleSetRange = (next: StatsRange) => {
    if (next === range) {
      return;
    }

    setRange(next);
  };

  return { data: data ?? null, loading: isPending, range, setRange: handleSetRange };
}

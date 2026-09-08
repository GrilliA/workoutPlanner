import { useState } from "react";
import {
  ApiError,
  getCoachAthleteAnalytics,
  useQuery,
  type StatsRange,
} from "@api";
import { toast } from "@components/toast";
import { mapClientAnalytics } from "../mappers/mapClientAnalytics";

export function useClientAnalytics(
  athleteId: number,
  initialRange: StatsRange = "4w",
) {
  const [range, setRange] = useState(initialRange);
  const { data, isPending } = useQuery({
    queryKey: [athleteId, range],
    queryFn: async ({ signal }) =>
      mapClientAnalytics(
        await getCoachAthleteAnalytics(athleteId, range, { signal }),
      ),
    fallback: "Impossibile caricare le analisi",
    throwOnError: false,
    keepPreviousData: true,
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

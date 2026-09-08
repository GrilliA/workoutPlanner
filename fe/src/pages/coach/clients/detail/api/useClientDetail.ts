import { ApiError, getCoachClient, useQuery, type CoachClientDetail } from "@api";

export function useClientDetail(athleteId: number) {
  const { data, isPending, setData } = useQuery({
    queryKey: [athleteId],
    queryFn: async ({ signal }) => {
      try {
        return await getCoachClient(athleteId, { signal });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }

        throw err;
      }
    },
    fallback: "Impossibile caricare il cliente",
  });

  const setDetail = (
    update:
      | CoachClientDetail
      | null
      | ((prev: CoachClientDetail | null) => CoachClientDetail | null),
  ) => {
    setData((prev) => {
      const current = prev ?? null;
      return typeof update === "function" ? update(current) : update;
    });
  };

  return { detail: data ?? null, setDetail, loading: isPending };
}

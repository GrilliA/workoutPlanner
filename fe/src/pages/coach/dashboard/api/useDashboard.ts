import {
  getCoachAnalyticsOverview,
  getCoachAssignments,
  getCoachClients,
  getCoachDashboard,
  isAbortError,
  useQuery,
} from "@api";
import { mapDashboard } from "../mappers/mapDashboard";

export function useDashboard() {
  const { data, isPending } = useQuery({
    queryFn: async ({ signal }) => {
      const [stats, clients, assignments, analytics] = await Promise.all([
        getCoachDashboard({ signal }),
        getCoachClients({ signal }),
        getCoachAssignments({ signal }),
        getCoachAnalyticsOverview("4w", { signal }).catch((err) => {
          if (isAbortError(err)) {
            throw err;
          }

          return null;
        }),
      ]);

      return mapDashboard(stats, clients, assignments, analytics);
    },
    fallback: "Impossibile caricare la dashboard",
  });

  return { data: data ?? null, loading: isPending };
}

import { useState } from "react";
import {
  ApiError,
  getCoachClientMealLogs,
  getCoachClientMealPlan,
  getCoachMealTags,
  useQuery,
  type MealPlan,
  type MealTagLists,
} from "@api";
import { toast } from "@components/toast";
import { adherenceRange } from "../mappers/adherence";

const LOGS_ERROR = "Impossibile caricare l'aderenza";

type PageRead = {
  isClientFound: boolean;
  mealPlan: MealPlan | null;
  tagLists: MealTagLists | null;
};

/**
 * The reads of the nutrition tab, started together. Plan and tags are the page read (a
 * failure shows the page error; a 404 means the client is not found); the last seven days
 * are a section that only toasts. `reload` reads everything again, `editorVersion` changes
 * with it so the editor starts over from the saved plan.
 */
export function useClientMealPlan(athleteId: number, today: string) {
  const [reloadCount, setReloadCount] = useState(0);
  const [logsReloadCount, setLogsReloadCount] = useState(0);

  const page = useQuery({
    queryKey: [athleteId, reloadCount],
    queryFn: async ({ signal }): Promise<PageRead> => {
      try {
        const [planResponse, tagLists] = await Promise.all([
          getCoachClientMealPlan(athleteId, { signal }),
          getCoachMealTags({ signal }),
        ]);
        return { isClientFound: true, mealPlan: planResponse.mealPlan, tagLists };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { isClientFound: false, mealPlan: null, tagLists: null };
        }

        throw error;
      }
    },
    fallback: "Impossibile caricare il piano pasti",
  });

  const logs = useQuery({
    queryKey: [athleteId, today, reloadCount, logsReloadCount],
    queryFn: ({ signal }) => getCoachClientMealLogs(athleteId, adherenceRange(today), { signal }),
    fallback: LOGS_ERROR,
    throwOnError: false,
    keepPreviousData: true,
    onError: (error) => {
      // A missing client is already shown by the page read.
      if (error.status !== 404) {
        toast.error(ApiError.messageFrom(error, LOGS_ERROR));
      }
    },
  });

  /** A saved or switched plan from a write: shown right away, the counts read again. */
  const showSavedPlan = (mealPlan: MealPlan) => {
    page.setData((current): PageRead => ({
      isClientFound: true,
      mealPlan,
      tagLists: current?.tagLists ?? null,
    }));
    setLogsReloadCount((count) => count + 1);
  };

  return {
    /** undefined while loading. */
    pageData: page.isPending ? undefined : page.data,
    logs: logs.data?.days,
    isLogsPending: logs.isPending,
    editorVersion: reloadCount,
    reload: () => setReloadCount((count) => count + 1),
    showSavedPlan,
  };
}

import { useState } from "react";
import {
  ApiError,
  getCoachToday,
  markClientHandled,
  unmarkClientHandled,
  useMutation,
  useQuery,
  type InboxItem,
} from "@api";
import { toast } from "@components/toast";
import { hideHandledItem, restoreHandledItem } from "../mappers/today";
import type { HandledRow, InboxChange } from "../types";

const LOAD_ERROR = "Impossibile caricare Oggi";
const MARK_ERROR = "Impossibile segnare come gestito";
const UNMARK_ERROR = "Impossibile annullare Gestito";

/**
 * The page read of Oggi plus "Gestito" and its "Annulla". A failed read shows the page error.
 * After each write the row moves on screen right away, then a reload brings the server truth.
 *
 * Each read remembers which reload it answers: until the latest one arrives the rows may be
 * stale, so "Gestito" waits for it (the row it hides is taken from the data on screen).
 */
export function useCoachToday() {
  const [reloadCount, setReloadCount] = useState(0);
  const [lastChange, setLastChange] = useState<InboxChange | null>(null);

  const query = useQuery({
    queryKey: [reloadCount],
    queryFn: async ({ signal }) => {
      const coachToday = await getCoachToday({ signal });
      return { coachToday, reloadCount };
    },
    fallback: LOAD_ERROR,
    keepPreviousData: true,
  });

  const coachToday = query.data?.coachToday;
  const isRefreshing = query.data !== undefined && query.data.reloadCount !== reloadCount;

  const reload = () => setReloadCount((count) => count + 1);

  // 404: the client was unlinked meanwhile, so the rows on screen are stale.
  const reportWriteError = (error: ApiError, fallback: string) => {
    toast.error(ApiError.messageFrom(error, fallback));

    if (error.status === 404) {
      setLastChange(null);
      reload();
    }
  };

  const mark = useMutation({
    mutationFn: (item: InboxItem) => markClientHandled(item.athleteId),
    fallback: MARK_ERROR,
    onSuccess: (_, item) => {
      if (coachToday !== undefined) {
        const position = coachToday.items.findIndex((candidate) => candidate.athleteId === item.athleteId);
        query.setData({ coachToday: hideHandledItem(coachToday, item.athleteId), reloadCount });
        setLastChange({ kind: "handled", row: { item, position: Math.max(position, 0) } });
      }

      reload();
    },
    onError: (error) => reportWriteError(error, MARK_ERROR),
  });

  const unmark = useMutation({
    mutationFn: (row: HandledRow) => unmarkClientHandled(row.item.athleteId),
    fallback: UNMARK_ERROR,
    onSuccess: (_, row) => {
      if (coachToday !== undefined) {
        query.setData({ coachToday: restoreHandledItem(coachToday, row), reloadCount });
      }

      setLastChange({ kind: "restored", row });
      reload();
    },
    onError: (error) => reportWriteError(error, UNMARK_ERROR),
  });

  const isWriting = mark.isPending || unmark.isPending;
  const markingItem = mark.isPending ? mark.variables : undefined;

  return {
    /** undefined until the first read arrives. */
    coachToday,
    lastChange,
    /** The client whose "Gestito" is on its way, to show the spinner on that row only. */
    markingAthleteId: markingItem?.athleteId ?? null,
    isMarkDisabled: isWriting || isRefreshing,
    isUndoPending: unmark.isPending,
    isUndoDisabled: isWriting,
    markHandled: (item: InboxItem) => mark.mutate(item),
    undoHandled: (row: HandledRow) => unmark.mutate(row),
  };
}

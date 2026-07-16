import { getSessionHistory } from "@api";

export const SESSION_HISTORY_PAGE_SIZE = 10;

export async function fetchSessionHistoryPage(page: number) {
  return getSessionHistory({ page, limit: SESSION_HISTORY_PAGE_SIZE });
}

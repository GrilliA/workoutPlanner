export type SessionHistoryItem = {
  id: number;
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
};

export type SessionHistoryView = {
  items: SessionHistoryItem[];
  page: number;
  totalPages: number;
  total: number;
};

export type SessionHistoryStatus = "loading" | "ready" | "error";

import { Skeleton } from "@components/skeleton";
import { CoachCard, CoachCardList } from "./CoachCard";

const PLACEHOLDER_CARDS = ["first", "second", "third"] as const;

/** Loading state for coach pages: card-shaped placeholders, announced once to screen readers. */
export function CoachCardListSkeleton() {
  return (
    <div className="coach-card-skeleton" role="status">
      <span className="sr-only">Caricamento…</span>
      <CoachCardList>
        {PLACEHOLDER_CARDS.map((placeholder) => (
          <CoachCard key={placeholder}>
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="text" width="70%" className="coach-card-skeleton__line" />
          </CoachCard>
        ))}
      </CoachCardList>
    </div>
  );
}

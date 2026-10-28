import { Link } from "wouter";
import { PageHeader } from "@components/pageHeader";
import { todayInRome } from "@utils/romeCalendar";
import { ActivityFeed } from "../activityFeed";
import { useCoachToday } from "../api/useCoachToday";
import { HandledNotice } from "../handledNotice";
import { Inbox } from "../inbox";
import { describeInboxChange, mapRecentActivity } from "../mappers/today";
import { CoachCardListSkeleton } from "@pages/coach/coachCard";
import "../../style.css";
import "./style.css";

export function TodayPage() {
  const {
    coachToday,
    lastChange,
    markingAthleteId,
    isMarkDisabled,
    isUndoPending,
    isUndoDisabled,
    markHandled,
    undoHandled,
  } = useCoachToday();
  const hasNoClients = coachToday !== undefined && coachToday.clientCount === 0;
  const hasClients = coachToday !== undefined && coachToday.clientCount > 0;
  const handledRow = lastChange?.kind === "handled" ? lastChange.row : null;
  const restoredAthleteId = lastChange?.kind === "restored" ? lastChange.row.item.athleteId : null;

  // A new notice per handled row: its "Annulla" mounts again and takes the focus.
  const notice =
    handledRow === null ? null : (
      <HandledNotice
        key={handledRow.item.athleteId}
        row={handledRow}
        isUndoPending={isUndoPending}
        isUndoDisabled={isUndoDisabled}
        onUndo={undoHandled}
      />
    );

  const headerAction = (
    <div className="coach-dashboard__actions">
      <Link href="/clients/new" className="coach-btn-link coach-btn-link--secondary">
        Invita cliente
      </Link>
      <Link href="/templates/new" className="coach-btn-link coach-btn-link--primary">
        Nuova scheda
      </Link>
    </div>
  );

  return (
    <div className="today-page coach-page page-container page-container--wide">
      <PageHeader title="Oggi" subtitle="Chi seguire oggi, dal più urgente" action={headerAction} />

      {/* Always mounted: screen readers skip a live region that appears already filled. */}
      <p className="sr-only" role="status">
        {describeInboxChange(lastChange)}
      </p>

      {coachToday === undefined ? <CoachCardListSkeleton /> : null}

      {hasNoClients ? (
        <section className="coach-dashboard__empty">
          <h2>Invita il primo cliente</h2>
          <p className="coach-empty">
            Condividi il codice invito: l&apos;atleta si registra sull&apos;app e si collega a te.
          </p>
          <div className="coach-dashboard__actions">
            <Link href="/clients/new" className="coach-btn-link coach-btn-link--primary">
              Invita cliente
            </Link>
            <Link href="/templates/new" className="coach-link">
              Oppure crea un template
            </Link>
          </div>
        </section>
      ) : null}

      {hasClients ? (
        <div className="layout">
          <Inbox
            items={coachToday.items}
            handledCount={coachToday.handledCount}
            notice={notice}
            restoredAthleteId={restoredAthleteId}
            markingAthleteId={markingAthleteId}
            isMarkDisabled={isMarkDisabled}
            today={todayInRome()}
            onMarkHandled={markHandled}
          />
          <ActivityFeed items={mapRecentActivity(coachToday.recentActivity)} />
        </div>
      ) : null}
    </div>
  );
}

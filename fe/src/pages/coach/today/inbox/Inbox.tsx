import type { ReactNode } from "react";
import { Link } from "wouter";
import type { InboxItem } from "@api";
import { Button } from "@components/button";
import { formatClientStatus } from "@pages/coach/clients/mappers/clientList";
import {
  CHURN_RISK_LABELS,
  INBOX_SEVERITY_LABELS,
  athleteLabel,
  formatHandledCount,
  formatPaidThrough,
  hasSubscriptionReason,
  inboxEmptyMessage,
  inboxReasons,
} from "../mappers/today";
import "./style.css";

type InboxProps = {
  items: InboxItem[];
  handledCount: number;
  /** Shown above the rows, also when the last one was just handled (the undo notice). */
  notice: ReactNode;
  /** The client "Annulla" just brought back: its name takes the focus. */
  restoredAthleteId: number | null;
  markingAthleteId: number | null;
  isMarkDisabled: boolean;
  today: string;
  onMarkHandled: (item: InboxItem) => void;
};

export function Inbox({
  items,
  handledCount,
  notice,
  restoredAthleteId,
  markingAthleteId,
  isMarkDisabled,
  today,
  onMarkHandled,
}: InboxProps) {
  return (
    <section className="inbox" aria-labelledby="inbox-title">
      <header className="header">
        <h2 id="inbox-title">Da gestire</h2>
        {handledCount > 0 ? <p className="handled-count">{formatHandledCount(handledCount)}</p> : null}
      </header>

      {notice}

      {items.length === 0 ? <p className="empty">{inboxEmptyMessage(handledCount)}</p> : null}

      {items.length > 0 ? (
        <ul className="rows">
          {items.map((item) => (
            <InboxRow
              key={item.athleteId}
              item={item}
              isRestored={item.athleteId === restoredAthleteId}
              isMarking={item.athleteId === markingAthleteId}
              isMarkDisabled={isMarkDisabled}
              today={today}
              onMarkHandled={onMarkHandled}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

type InboxRowProps = {
  item: InboxItem;
  isRestored: boolean;
  isMarking: boolean;
  isMarkDisabled: boolean;
  today: string;
  onMarkHandled: (item: InboxItem) => void;
};

// A stable function: React calls it once when the restored row's name mounts.
const focusElement = (element: HTMLElement | null) => {
  element?.focus();
};

function InboxRow({ item, isRestored, isMarking, isMarkDisabled, today, onMarkHandled }: InboxRowProps) {
  const label = athleteLabel(item.athleteName, item.athleteEmail);
  const hasName = label !== item.athleteEmail;
  const statusTone = item.subscription?.status ?? "none";
  const paidThrough = formatPaidThrough(item.subscription, today);
  const riskLabel = item.risk === null ? null : CHURN_RISK_LABELS[item.risk.level];

  return (
    <li className={`row row--${item.severity}`}>
      <div className="details">
        <div className="identity">
          <h3 className="name">
            <Link href={`/clients/${item.athleteId}`} ref={isRestored ? focusElement : undefined}>
              {label}
            </Link>
          </h3>
          <span className={`severity severity--${item.severity}`}>{INBOX_SEVERITY_LABELS[item.severity]}</span>
        </div>

        {hasName ? <p className="email">{item.athleteEmail}</p> : null}

        {riskLabel !== null ? <p className="risk">{riskLabel}</p> : null}

        <ul className="reasons">
          {inboxReasons(item).map((reason) => (
            <li key={reason.kind} className="reason">
              <span className={`dot dot--${reason.tone}`} aria-hidden="true" />
              {reason.message}
            </li>
          ))}
        </ul>

        <p className="subscription">
          <span className={`status status--${statusTone}`}>{formatClientStatus(item.subscription)}</span>
          {paidThrough !== null ? <span className="paid-through">{paidThrough}</span> : null}
        </p>
      </div>

      <div className="actions">
        {hasSubscriptionReason(item) ? (
          <Link
            href={`/clients/${item.athleteId}/subscription`}
            className="coach-link"
            aria-label={`Abbonamento di ${label}`}
          >
            Abbonamento
          </Link>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          loading={isMarking}
          disabled={isMarkDisabled}
          aria-label={`Gestito: ${label}`}
          onClick={() => onMarkHandled(item)}
        >
          Gestito
        </Button>
      </div>
    </li>
  );
}

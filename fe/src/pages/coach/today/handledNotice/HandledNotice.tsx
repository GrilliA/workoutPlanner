import { Button } from "@components/button";
import { athleteLabel } from "../mappers/today";
import type { HandledRow } from "../types";
import "./style.css";

type HandledNoticeProps = {
  row: HandledRow;
  isUndoPending: boolean;
  isUndoDisabled: boolean;
  onUndo: (row: HandledRow) => void;
};

/**
 * Shown after "Gestito" until the next change. The page mounts it again for each row, so
 * `autoFocus` moves the focus here: the button the coach pressed has just left the list.
 */
export function HandledNotice({ row, isUndoPending, isUndoDisabled, onUndo }: HandledNoticeProps) {
  const label = athleteLabel(row.item.athleteName, row.item.athleteEmail);

  return (
    <div className="handled-notice">
      <p className="message">
        Gestito: <strong>{label}</strong>
      </p>
      <Button
        variant="secondary"
        size="sm"
        autoFocus
        loading={isUndoPending}
        disabled={isUndoDisabled}
        aria-label={`Annulla Gestito per ${label}`}
        onClick={() => onUndo(row)}
      >
        Annulla
      </Button>
    </div>
  );
}

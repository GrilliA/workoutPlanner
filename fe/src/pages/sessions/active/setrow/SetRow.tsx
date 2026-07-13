import { useState } from "react";
import { Button } from "@components/button";
import type { ActiveSetRow } from "../types";
import "./style.css";

export type SetRowProps = {
  set: ActiveSetRow;
  isLogging: boolean;
  onLog: (weightKg: string, reps: number) => Promise<void>;
};

export function SetRow({ set, isLogging, onLog }: SetRowProps) {
  const [weightKg, setWeightKg] = useState(set.weightKg);
  const [reps, setReps] = useState(String(set.targetReps));

  if (set.status === "completed") {
    return (
      <div className="set-row set-row--completed">
        <span className="index">{set.setNumber}</span>
        <span className="value">
          {set.weightKg ? `${set.weightKg} kg` : "—"}
        </span>
        <span className="value">{set.targetReps}</span>
        <span className="status" aria-label="Serie completata">
          ✓
        </span>
      </div>
    );
  }

  const isActive = set.status === "active";

  const handleLog = () => {
    const parsedReps = Number(reps);

    if (!Number.isInteger(parsedReps) || parsedReps < 1) {
      return;
    }

    void onLog(weightKg, parsedReps);
  };

  return (
    <div className={`set-row ${isActive ? "set-row--active" : "set-row--pending"}`}>
      <span className="index">{set.setNumber}</span>

      <label className="weight-field">
        <span className="sr-only">Peso serie {set.setNumber}</span>
        <input
          className="set-input"
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={weightKg}
          onChange={(event) => setWeightKg(event.target.value)}
          disabled={!isActive || isLogging}
        />
        <span className="suffix">kg</span>
      </label>

      <label className="reps-field">
        <span className="sr-only">Reps serie {set.setNumber}</span>
        <input
          className="set-input"
          type="number"
          min={1}
          step={1}
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          disabled={!isActive || isLogging}
        />
      </label>

      {isActive ? (
        <Button.Root
          variant="ghost"
          size="sm"
          className="log"
          loading={isLogging}
          disabled={isLogging}
          onClick={handleLog}
        >
          <Button.Label>LOGGA</Button.Label>
        </Button.Root>
      ) : (
        <span className="placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

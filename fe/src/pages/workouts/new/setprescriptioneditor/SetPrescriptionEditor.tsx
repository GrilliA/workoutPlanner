import type { DraftSetPrescription } from "../types";
import "./style.css";

export type SetPrescriptionEditorProps = {
  prescriptions: DraftSetPrescription[];
  onChange: (prescriptions: DraftSetPrescription[]) => void;
};

const reindexPrescriptions = (
  prescriptions: DraftSetPrescription[],
): DraftSetPrescription[] =>
  prescriptions.map((entry, index) => ({
    ...entry,
    setNumber: index + 1,
  }));

export function SetPrescriptionEditor({
  prescriptions,
  onChange,
}: SetPrescriptionEditorProps) {
  const updateRow = (
    setNumber: number,
    field: "reps" | "restSec",
    value: number,
  ) => {
    onChange(
      prescriptions.map((entry) =>
        entry.setNumber === setNumber ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const addSet = () => {
    const last = prescriptions[prescriptions.length - 1];

    onChange(
      reindexPrescriptions([
        ...prescriptions,
        {
          setNumber: prescriptions.length + 1,
          reps: last?.reps ?? 10,
          restSec: last?.restSec ?? 90,
        },
      ]),
    );
  };

  const removeSet = (setNumber: number) => {
    if (prescriptions.length <= 1) {
      return;
    }

    onChange(
      reindexPrescriptions(
        prescriptions.filter((entry) => entry.setNumber !== setNumber),
      ),
    );
  };

  return (
    <div className="set-prescription-editor">
      <div className="header" aria-hidden="true">
        <span>Serie</span>
        <span>Reps</span>
        <span>Recupero</span>
        <span />
      </div>

      {prescriptions.map((entry) => (
        <div key={entry.setNumber} className="row">
          <span className="index">{entry.setNumber}</span>

          <label className="field">
            <span className="sr-only">Reps serie {entry.setNumber}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={entry.reps}
              onChange={(event) =>
                updateRow(entry.setNumber, "reps", Number(event.target.value))
              }
              required
            />
          </label>

          <label className="field rest">
            <span className="sr-only">Recupero serie {entry.setNumber}</span>
            <input
              type="number"
              min={0}
              step={15}
              value={entry.restSec}
              onChange={(event) =>
                updateRow(entry.setNumber, "restSec", Number(event.target.value))
              }
              required
            />
            <span className="suffix">s</span>
          </label>

          <button
            type="button"
            className="remove"
            aria-label={`Rimuovi serie ${entry.setNumber}`}
            disabled={prescriptions.length <= 1}
            onClick={() => removeSet(entry.setNumber)}
          >
            ×
          </button>
        </div>
      ))}

      <button type="button" className="add-set" onClick={addSet}>
        + Aggiungi serie
      </button>
    </div>
  );
}

import { LOAD_UNITS } from "@api/schemas/exercise";
import { SelectBase } from "@components/select";
import {
  createDefaultSetPrescriptions,
  LOAD_UNIT_LABELS,
  type DraftSetPrescription,
  type LoadUnit,
} from "../types";
import "./style.css";

const LOAD_UNIT_OPTIONS = LOAD_UNITS.map((unit) => ({
  value: unit,
  label: LOAD_UNIT_LABELS[unit],
}));

export type SetPrescriptionEditorProps = {
  prescriptions: DraftSetPrescription[];
  onChange: (prescriptions: DraftSetPrescription[]) => void;
};

type RequiredField = "reps" | "restSec";
type OptionalField = "repsMax" | "loadValue" | "rir";

const reindexPrescriptions = (
  prescriptions: DraftSetPrescription[],
): DraftSetPrescription[] =>
  prescriptions.map((entry, index) => ({
    ...entry,
    setNumber: index + 1,
  }));

// An empty required field is kept as NaN instead of 0, so the coach can clear it and type again.
// Saving rejects NaN: findExerciseInputError only accepts integers.
const parseRequiredNumber = (raw: string): number => (raw === "" ? Number.NaN : Number(raw));

// An empty optional field means "not prescribed".
const parseOptionalNumber = (raw: string): number | null => (raw === "" ? null : Number(raw));

const toRequiredFieldValue = (value: number): number | string =>
  Number.isNaN(value) ? "" : value;

const toOptionalFieldValue = (value: number | null): number | string => value ?? "";

const isLoadUnit = (value: string): value is LoadUnit =>
  LOAD_UNITS.some((unit) => unit === value);

export function SetPrescriptionEditor({
  prescriptions,
  onChange,
}: SetPrescriptionEditorProps) {
  const updateRow = (setNumber: number, changes: Partial<DraftSetPrescription>) => {
    onChange(
      prescriptions.map((entry) =>
        entry.setNumber === setNumber ? { ...entry, ...changes } : entry,
      ),
    );
  };

  const updateRequiredField = (setNumber: number, field: RequiredField, raw: string) => {
    updateRow(setNumber, { [field]: parseRequiredNumber(raw) });
  };

  const updateOptionalField = (setNumber: number, field: OptionalField, raw: string) => {
    updateRow(setNumber, { [field]: parseOptionalNumber(raw) });
  };

  const updateLoadUnit = (setNumber: number, raw: string) => {
    if (isLoadUnit(raw)) {
      updateRow(setNumber, { loadUnit: raw });
    }
  };

  // A new set copies the last one, so a coach adding a 4th set keeps reps, load and RIR.
  const addSet = () => {
    const last = prescriptions[prescriptions.length - 1];
    const template = last ?? createDefaultSetPrescriptions(1)[0];

    onChange(reindexPrescriptions([...prescriptions, { ...template }]));
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
        <span>Fino a</span>
        <span>Carico</span>
        <span>RIR</span>
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
              value={toRequiredFieldValue(entry.reps)}
              onChange={(event) =>
                updateRequiredField(entry.setNumber, "reps", event.target.value)
              }
              required
            />
          </label>

          <label className="field">
            <span className="sr-only">Reps massime serie {entry.setNumber} (facoltativo)</span>
            <input
              type="number"
              min={1}
              step={1}
              placeholder="–"
              value={toOptionalFieldValue(entry.repsMax)}
              onChange={(event) =>
                updateOptionalField(entry.setNumber, "repsMax", event.target.value)
              }
            />
          </label>

          <div className="field load">
            <label>
              <span className="sr-only">Carico serie {entry.setNumber} (facoltativo)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                placeholder="–"
                value={toOptionalFieldValue(entry.loadValue)}
                onChange={(event) =>
                  updateOptionalField(entry.setNumber, "loadValue", event.target.value)
                }
              />
            </label>
            <SelectBase
              aria-label={`Unità carico serie ${entry.setNumber}`}
              value={entry.loadUnit}
              options={LOAD_UNIT_OPTIONS}
              onChange={(unit) => updateLoadUnit(entry.setNumber, unit)}
            />
          </div>

          <label className="field">
            <span className="sr-only">RIR serie {entry.setNumber} (facoltativo)</span>
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              placeholder="–"
              value={toOptionalFieldValue(entry.rir)}
              onChange={(event) =>
                updateOptionalField(entry.setNumber, "rir", event.target.value)
              }
            />
          </label>

          <label className="field rest">
            <span className="sr-only">Recupero serie {entry.setNumber}</span>
            <input
              type="number"
              min={0}
              step={15}
              value={toRequiredFieldValue(entry.restSec)}
              onChange={(event) =>
                updateRequiredField(entry.setNumber, "restSec", event.target.value)
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

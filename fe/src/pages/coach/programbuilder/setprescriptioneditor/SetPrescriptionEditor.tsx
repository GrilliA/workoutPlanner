import { LOAD_UNITS, MAX_SETS_PER_EXERCISE } from "@api/schemas/exercise";
import { UnitInput } from "@components/unitInput";
import {
  createDefaultSetPrescriptions,
  LOAD_UNIT_LABELS,
  type DraftSetPrescription,
} from "../types";
import "./style.css";

export type SetPrescriptionEditorProps = {
  prescriptions: DraftSetPrescription[];
  onChange: (prescriptions: DraftSetPrescription[]) => void;
};

type RequiredField = "reps" | "restSec";
type OptionalField = "loadValue" | "rir";

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

  // The panel no longer edits a rep range (it comes from the TXT import). It stays while the
  // reps fit under its top; past it the range goes, so a range the coach cannot see never blocks
  // the save. An empty field is a coach still typing, so it keeps the range.
  const updateReps = (entry: DraftSetPrescription, raw: string) => {
    const reps = parseRequiredNumber(raw);
    const isPastRange = entry.repsMax !== null && reps > entry.repsMax;

    updateRow(entry.setNumber, isPastRange ? { reps, repsMax: null } : { reps });
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
              onChange={(event) => updateReps(entry, event.target.value)}
              required
            />
          </label>

          <UnitInput
            type="number"
            min={0}
            step={0.5}
            placeholder="–"
            aria-label={`Carico serie ${entry.setNumber} (facoltativo)`}
            value={toOptionalFieldValue(entry.loadValue)}
            onChange={(event) =>
              updateOptionalField(entry.setNumber, "loadValue", event.target.value)
            }
            unit={entry.loadUnit}
            units={LOAD_UNITS}
            unitLabels={LOAD_UNIT_LABELS}
            unitAriaLabel={`Unità carico serie ${entry.setNumber}`}
            onUnitChange={(loadUnit) => updateRow(entry.setNumber, { loadUnit })}
          />

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

      <button
        type="button"
        className="add-set"
        disabled={prescriptions.length >= MAX_SETS_PER_EXERCISE}
        onClick={addSet}
      >
        + Aggiungi serie
      </button>
    </div>
  );
}

import {
  FREQUENCY_OPTIONS,
  REST_SEC_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  type WorkoutSettings,
} from "../types";
import { SettingRow } from "./settingrow";
import "./style.css";

export type WorkoutSettingsPanelProps = {
  settings: WorkoutSettings;
  onChange: (settings: WorkoutSettings) => void;
};

const cycleOption = <T extends string | number>(
  options: readonly T[],
  current: T,
): T => {
  const index = options.indexOf(current);
  const nextIndex = index === -1 ? 0 : (index + 1) % options.length;
  return options[nextIndex] ?? options[0];
};

export function WorkoutSettingsPanel({
  settings,
  onChange,
}: WorkoutSettingsPanelProps) {
  return (
    <section className="workout-settings" aria-labelledby="workout-settings-title">
      <h2 id="workout-settings-title" className="eyebrow">
        IMPOSTAZIONI SCHEDA
      </h2>

      <div className="panel">
        <SettingRow
          label="Recupero default"
          value={`${settings.defaultRestSec} sec`}
          onClick={() =>
            onChange({
              ...settings,
              defaultRestSec: cycleOption(REST_SEC_OPTIONS, settings.defaultRestSec),
            })
          }
        />
        <SettingRow
          label="Tipo di scheda"
          value={settings.workoutType}
          onClick={() =>
            onChange({
              ...settings,
              workoutType: cycleOption(WORKOUT_TYPE_OPTIONS, settings.workoutType),
            })
          }
        />
        <SettingRow
          label="Frequenza"
          value={settings.frequency}
          onClick={() =>
            onChange({
              ...settings,
              frequency: cycleOption(FREQUENCY_OPTIONS, settings.frequency),
            })
          }
        />
      </div>
    </section>
  );
}

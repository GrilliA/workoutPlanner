import "./style.css";

export type SettingRowProps = {
  label: string;
  value: string;
  onClick: () => void;
};

export function SettingRow({ label, value, onClick }: SettingRowProps) {
  return (
    <button type="button" className="setting-row" onClick={onClick}>
      <span className="label">{label}</span>
      <span className="value-group">
        <span className="value">{value}</span>
        <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m9 18 6-6-6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

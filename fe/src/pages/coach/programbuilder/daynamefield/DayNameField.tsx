import { Input } from "@components/input";
import "./style.css";

export type DayNameFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DayNameField({ value, onChange }: DayNameFieldProps) {
  return (
    <section className="day-name-field" aria-labelledby="day-name-label">
      <Input
        id="day-name"
        label="NOME GIORNO"
        name="dayName"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Petto + Bicipiti"
        autoComplete="off"
      />
    </section>
  );
}

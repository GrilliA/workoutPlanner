import { CLIENT_FILTER_OPTIONS, CLIENT_FILTERS, type ClientFilter } from "../mappers/clientList";
import "./style.css";

type ClientFiltersProps = {
  value: ClientFilter;
  onChange: (filter: ClientFilter) => void;
};

export function ClientFilters({ value, onChange }: ClientFiltersProps) {
  return (
    <div className="client-filters" role="group" aria-label="Filtra per stato dell'abbonamento">
      {CLIENT_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className="filter"
          aria-pressed={filter === value}
          onClick={() => onChange(filter)}
        >
          {CLIENT_FILTER_OPTIONS[filter].label}
        </button>
      ))}
    </div>
  );
}

import "./style.css";

const dayLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function getWeekDays(reference = new Date()) {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(reference.getDate() + mondayOffset);

  return dayLabels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label,
      date,
      isToday: date.toDateString() === reference.toDateString(),
    };
  });
}

export function WeekStrip() {
  const days = getWeekDays();

  return (
    <div className="week-strip" aria-label="Settimana corrente">
      {days.map((day) => (
        <button
          key={day.label}
          type="button"
          className={day.isToday ? "day today" : "day"}
          aria-current={day.isToday ? "date" : undefined}
        >
          <span className="label">{day.label}</span>
          <span className="number">{day.date.getDate()}</span>
        </button>
      ))}
    </div>
  );
}

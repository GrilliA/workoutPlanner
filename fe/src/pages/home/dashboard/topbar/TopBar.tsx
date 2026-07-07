import "./style.css";

export type TopBarProps = {
  userName: string;
};

const formatItalianDate = (date: Date) =>
  date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export function TopBar({ userName }: TopBarProps) {
  const today = formatItalianDate(new Date());

  return (
    <header className="top-bar">
      <div className="copy">
        <p className="greeting">Ciao, {userName}</p>
        <p className="date">{today}</p>
      </div>
      <div className="actions">
        <button type="button" className="bell" aria-label="Notifiche">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3a5 5 0 0 1 5 5v2.2c0 .5.2 1 .5 1.4L19 14H5l1.5-2.4c.3-.4.5-.9.5-1.4V8a5 5 0 0 1 5-5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M10 18a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
        <div className="avatar" aria-hidden="true">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

import { Skeleton } from "@components/skeleton";
import { useAuth } from "@auth";
import { getAvatarInitial, getDisplayName } from "@utils/displayName";
import "./style.css";

const formatItalianDate = (date: Date) =>
  date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

function TopBarSkeleton() {
  return (
    <header className="top-bar loading" aria-busy="true">
      <div className="copy">
        <Skeleton variant="text" width="55%" height={24} />
        <Skeleton variant="text" width="70%" />
      </div>
      <div className="actions">
        <Skeleton variant="block" width={40} height={40} className="avatar-skeleton" />
      </div>
    </header>
  );
}

export function TopBar() {
  const { user, status } = useAuth();

  if (status === "loading") {
    return <TopBarSkeleton />;
  }

  const displayName = getDisplayName(user) || "Utente";
  const today = formatItalianDate(new Date());

  return (
    <header className="top-bar">
      <div className="copy">
        <p className="greeting">Ciao, {displayName}</p>
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
          {getAvatarInitial(displayName)}
        </div>
      </div>
    </header>
  );
}

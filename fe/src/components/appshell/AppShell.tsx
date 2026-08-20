import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandlogo";
import { getAvatarInitial, getDisplayName } from "@utils/displayName";
import "./style.css";

type AppShellProps = {
  children: ReactNode;
  hideBottomNav?: boolean;
};

type SidebarLink = {
  label: string;
  href: string;
  icon: "home" | "clients" | "analytics" | "template" | "assignments" | "settings";
};

const sidebarLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Clienti", href: "/clients", icon: "clients" },
  { label: "Analisi", href: "/analytics", icon: "analytics" },
  { label: "Template", href: "/templates", icon: "template" },
  { label: "Schede assegnate", href: "/assignments", icon: "assignments" },
  { label: "Impostazioni", href: "/settings", icon: "settings" },
];

const bottomNavItems = [
  { label: "Home", href: "/dashboard", icon: "home" as const },
  { label: "Clienti", href: "/clients", icon: "clients" as const },
  { label: "Analisi", href: "/analytics", icon: "analytics" as const },
  { label: "Template", href: "/templates", icon: "template" as const },
  { label: "Schede", href: "/assignments", icon: "assignments" as const },
];

export function AppShell({ children, hideBottomNav = false }: AppShellProps) {
  const { logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const displayName = getDisplayName(user);
  const initials = getAvatarInitial(displayName);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className={`app-shell ${hideBottomNav ? "app-shell--focus" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <BrandLogo size="sm" layout="inline" mark="coach" />
        </div>

        {displayName ? (
          <div className="coach-card">
            <span className="coach-card__avatar" aria-hidden>
              {initials}
            </span>
            <div className="coach-card__meta">
              <p className="coach-card__name">{displayName}</p>
              <p className="coach-card__role">Coach</p>
            </div>
          </div>
        ) : null}

        <nav className="nav" aria-label="Navigazione desktop">
          {sidebarLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={(active) => (active ? "item active" : "item")}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button type="button" className="item logout" onClick={() => void handleLogout()}>
            Logout
          </button>
        </nav>
      </aside>

      <div className="content">{children}</div>

      <nav className="bottom-nav" aria-label="Navigazione principale">
        {bottomNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={(active) => (active ? "item active" : "item")}
          >
            <NavIcon name={item.icon} />
            <span className="label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === "home" ? (
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          fill="currentColor"
        />
      ) : null}
      {name === "clients" ? (
        <path
          d="M6.5 8.5 4 11v2l2.5 2.5M17.5 8.5 20 11v2l-2.5 2.5M9 12h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
      {name === "analytics" ? (
        <path
          d="M5 19V9m7 10V5m7 14v-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
      {name === "template" ? (
        <>
          <rect
            x="5"
            y="4"
            width="14"
            height="16"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 9h8M8 13h8M8 17h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {name === "assignments" ? (
        <path
          d="M12 8v5l3 2M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "settings" ? (
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-3.5a7.4 7.4 0 0 0-.15-1.63l1.72-1.34-1.63-2.82-2.05.82a7.6 7.6 0 0 0-1.41-.82L15.5 3h-3.26l-.48 2.21a7.6 7.6 0 0 0-1.41.82l-2.05-.82-1.63 2.82 1.72 1.34c-.1.54-.15 1.08-.15 1.63s.05 1.09.15 1.63l-1.72 1.34 1.63 2.82 2.05-.82c.43.33.9.6 1.41.82l.48 2.21h3.26l.48-2.21c.51-.22.98-.49 1.41-.82l2.05.82 1.63-2.82-1.72-1.34c.1-.54.15-1.08.15-1.63Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

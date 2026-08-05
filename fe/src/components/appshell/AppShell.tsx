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
};

const sidebarLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Clienti", href: "/clients" },
  { label: "Template", href: "/templates" },
  { label: "Schede assegnate", href: "/assignments" },
  { label: "Impostazioni", href: "/settings" },
];

const bottomNavItems = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Clienti", href: "/clients", icon: "workout" },
  { label: "Template", href: "/templates", icon: "stats" },
  { label: "Schede", href: "/assignments", icon: "history" },
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
              {item.label}
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
      {name === "workout" ? (
        <path
          d="M6.5 8.5 4 11v2l2.5 2.5M17.5 8.5 20 11v2l-2.5 2.5M9 12h6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
      {name === "stats" ? (
        <path
          d="M5 19V9m7 10V5m7 14v-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
      {name === "history" ? (
        <path
          d="M12 8v5l3 2M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

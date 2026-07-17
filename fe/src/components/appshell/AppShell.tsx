import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@auth";
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
  { label: "Home", href: "/" },
  { label: "Workout", href: "/workouts" },
  { label: "Crea scheda", href: "/workouts/new" },
  { label: "Storico sessioni", href: "/session-history" },
  { label: "Impostazioni", href: "/settings" },
];

const bottomNavItems = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Workout", href: "/workouts", icon: "workout" },
  { label: "Progressi", href: "/stats", icon: "stats" },
  { label: "Storico", href: "/session-history", icon: "history" },
];

export function AppShell({ children, hideBottomNav = false }: AppShellProps) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className={`app-shell ${hideBottomNav ? "app-shell--focus" : ""}`}>
      <aside className="sidebar">
        <div className="brand">TRACCIA</div>
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

      <div className="content">
        {children}
      </div>

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
          d="M7.5 7.5V4.8c0-.4.5-.7.8-.4l1.8 1.3 1.8-1.3c.3-.2.8 0 .8.4V7.5h2.2A9.5 9.5 0 1 1 6.1 9"
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

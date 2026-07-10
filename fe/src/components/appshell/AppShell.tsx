import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@auth";
import "./style.css";

type AppShellProps = {
  children: ReactNode;
};

const sidebarLinks = [
  { label: "Home", href: "/" },
  { label: "Impostazioni", href: "/settings" },
];

const bottomNavItems = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Workout", href: "/workouts", icon: "workout" },
  { label: "Stats", href: "/stats", icon: "stats" },
  { label: "Profilo", href: "/profile", icon: "profile" },
];

export function AppShell({ children }: AppShellProps) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">TRACCIA</div>
        <nav className="nav">
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
      {name === "profile" ? (
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
          fill="currentColor"
        />
      ) : null}
    </svg>
  );
}

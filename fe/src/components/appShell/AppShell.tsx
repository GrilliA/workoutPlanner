import { useId, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandLogo";
import { getAvatarInitial, getDisplayName } from "@utils/displayName";
import "./style.css";

type AppShellProps = {
  children: ReactNode;
  hideBottomNav?: boolean;
};

type NavIconName =
  | "home"
  | "clients"
  | "analytics"
  | "business"
  | "template"
  | "assignments"
  | "mealTemplate"
  | "mealTag"
  | "settings"
  | "more";

type NavLink = {
  label: string;
  href: string;
  icon: NavIconName;
};

const TEMPLATES_LINK: NavLink = { label: "Template", href: "/templates", icon: "template" };
const MEAL_TEMPLATES_LINK: NavLink = {
  label: "Template pasti",
  href: "/meal-templates",
  icon: "mealTemplate",
};
const MEAL_TAGS_LINK: NavLink = { label: "Tag pasti", href: "/meal-tags", icon: "mealTag" };
const SETTINGS_LINK: NavLink = { label: "Impostazioni", href: "/settings", icon: "settings" };

const sidebarLinks: NavLink[] = [
  { label: "Oggi", href: "/today", icon: "home" },
  { label: "Clienti", href: "/clients", icon: "clients" },
  { label: "Analisi", href: "/analytics", icon: "analytics" },
  { label: "Business", href: "/business", icon: "business" },
  TEMPLATES_LINK,
  { label: "Schede assegnate", href: "/assignments", icon: "assignments" },
];

const nutritionLinks: NavLink[] = [MEAL_TEMPLATES_LINK, MEAL_TAGS_LINK];

// Six places at most at 360px: the libraries and the settings live behind "Altro".
const bottomNavItems: NavLink[] = [
  { label: "Oggi", href: "/today", icon: "home" },
  { label: "Clienti", href: "/clients", icon: "clients" },
  { label: "Analisi", href: "/analytics", icon: "analytics" },
  { label: "Business", href: "/business", icon: "business" },
  { label: "Schede", href: "/assignments", icon: "assignments" },
];

const moreLinks: NavLink[] = [TEMPLATES_LINK, MEAL_TEMPLATES_LINK, MEAL_TAGS_LINK, SETTINGS_LINK];

// `/profile` is the old address of the settings page.
const SECTION_ALIASES: Record<string, string> = { "/profile": "/settings" };

/** A section stays active on its sub-routes: `/clients/42/subscription` is still Clienti. */
const isSectionActive = (location: string, href: string): boolean => {
  const sectionLocation = SECTION_ALIASES[location] ?? location;

  return sectionLocation === href || sectionLocation.startsWith(`${href}/`);
};

export function AppShell({ children, hideBottomNav = false }: AppShellProps) {
  const { logout, user } = useAuth();
  const [location, setLocation] = useLocation();
  const displayName = getDisplayName(user);
  const initials = getAvatarInitial(displayName);
  const nutritionGroupId = useId();
  const moreMenuId = useId();
  const isMoreActive = moreLinks.some((item) => isSectionActive(location, item.href));

  const sidebarLink = (item: NavLink) => (
    <Link
      key={item.label}
      href={item.href}
      className="item"
      aria-current={isSectionActive(location, item.href) ? "page" : undefined}
    >
      <NavIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>
  );

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
          {sidebarLinks.map(sidebarLink)}
          <div className="group" role="group" aria-labelledby={nutritionGroupId}>
            <p id={nutritionGroupId} className="group-label">
              Alimentazione
            </p>
            {nutritionLinks.map(sidebarLink)}
          </div>
          <div className="group">{sidebarLink(SETTINGS_LINK)}</div>
          <button
            type="button"
            className="item logout"
            data-leaves-page
            onClick={() => void handleLogout()}
          >
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
            className="item"
            aria-current={isSectionActive(location, item.href) ? "page" : undefined}
          >
            <NavIcon name={item.icon} />
            <span className="label">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`item more ${isMoreActive ? "item--active" : ""}`}
          popoverTarget={moreMenuId}
        >
          <NavIcon name="more" />
          <span className="label">Altro</span>
          {isMoreActive ? <span className="sr-only">, contiene la pagina attuale</span> : null}
        </button>
        {/* A new location remounts the menu, so it is closed after a link was followed. */}
        <div key={location} id={moreMenuId} popover="auto" className="more-menu">
          <ul>
            {moreLinks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="more-link"
                  aria-current={isSectionActive(location, item.href) ? "page" : undefined}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
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
      {name === "business" ? (
        <>
          <rect
            x="4"
            y="7"
            width="16"
            height="12"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
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
      {name === "mealTemplate" ? (
        <path
          d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2 1.5-3 4-3 7v3h3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "mealTag" ? (
        <>
          <path
            d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.4 7.4a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.4-7.4a1 1 0 0 1-.3-.7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </>
      ) : null}
      {name === "more" ? (
        <>
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </>
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

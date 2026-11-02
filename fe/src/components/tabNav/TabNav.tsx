import { Link } from "wouter";
import { cx } from "@utils/cx";
import "./style.css";

export type TabNavItem = {
  label: string;
  href: string;
};

export type TabNavProps = {
  /** Names the navigation for screen readers, e.g. "Sezioni cliente". */
  label: string;
  items: TabNavItem[];
  /** The tab of the current page; the parent decides it, so an alias route can point to one. */
  activeHref: string;
};

/** Tabs that are links: each tab is its own route, so refresh and back keep it. */
export function TabNav({ label, items, activeHref }: TabNavProps) {
  return (
    <nav className="tab-nav" aria-label={label}>
      {items.map((item) => {
        const isActive = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx("tab", isActive && "tab--active")}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

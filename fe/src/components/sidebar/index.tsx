import { Link } from "wouter";
import "./sidebar.css";

const sidebarItems = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Settings",
    href: "/settings",
  },
  {
    label: "Logout",
    href: "/logout",
  },
] as const;

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main">
      {sidebarItems.map((item) => (
        <Link
          href={item.href}
          className={(active) => (active ? "item active" : "item")}
          key={item.label}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

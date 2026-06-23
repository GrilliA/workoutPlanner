import { Link } from "wouter";
import "./home.css";
export default function HomePage() {
  return (
    <>
      <Sidebar />
    </>
  );
}

const sidebarItems = [
  {
    icon: "home",
    label: "Home",
    href: "/",
  },
  {
    icon: "settings",
    label: "Settings",
    href: "/settings",
  },
  {
    icon: "logout",
    label: "Logout",
    href: "/logout",
  },
];

const Sidebar = () => {
  return (
    <div className="sidebar">
      {sidebarItems.map((item) => (
        <Link
          href={item.href}
          className={(active) =>
            active ? "sidebar-item active" : "sidebar-item"
          }
          key={item.label}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

import { Link } from "wouter";
import { WorkoutsPanel } from "./WorkoutsPanel";
import "./home.css";

export default function HomePage() {
  return (
    <div className="home">
      <Sidebar />
      <main className="main">
        <WorkoutsPanel />
      </main>
    </div>
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
          className={(active) => (active ? "item active" : "item")}
          key={item.label}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
};

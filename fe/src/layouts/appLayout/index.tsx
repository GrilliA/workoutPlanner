import type { ReactNode } from "react";
import { Sidebar } from "@components/sidebar";
import "./appLayout.css";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="appLayout">
      <Sidebar />
      <main className="appLayout-main">{children}</main>
    </div>
  );
}

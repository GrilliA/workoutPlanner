import { AppShell } from "@components/layout/AppShell";
import { Dashboard } from "@components/dashboard/Dashboard";
import "@components/layout/app-shell.css";

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

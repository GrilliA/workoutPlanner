import { AppShell } from "@components/appshell";
import { Dashboard } from "@dashboard/dashboard";

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

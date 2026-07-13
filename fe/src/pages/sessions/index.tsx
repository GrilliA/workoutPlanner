import { useRoute } from "wouter";
import { AppShell } from "@components/appshell";
import { ActiveSession } from "./active/activesession";

export default function SessionPage() {
  const [, params] = useRoute("/sessions/:sessionId");
  const sessionId = Number(params?.sessionId);

  if (!Number.isFinite(sessionId) || sessionId < 1) {
    return (
      <AppShell hideBottomNav>
        <div className="session-page-invalid">
          <p>Sessione non valida</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideBottomNav>
      <ActiveSession sessionId={sessionId} />
    </AppShell>
  );
}

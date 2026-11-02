import { TabNav } from "@components/tabNav";

type ClientTab = "workouts" | "subscription";

export function ClientTabs({ athleteId, activeTab }: { athleteId: number; activeTab: ClientTab }) {
  const workoutsHref = `/clients/${athleteId}`;
  const subscriptionHref = `/clients/${athleteId}/subscription`;
  const activeHref = activeTab === "workouts" ? workoutsHref : subscriptionHref;

  return (
    <TabNav
      label="Sezioni cliente"
      items={[
        { label: "Allenamenti", href: workoutsHref },
        { label: "Abbonamento", href: subscriptionHref },
      ]}
      activeHref={activeHref}
    />
  );
}

import { TabNav } from "@components/tabNav";

type ClientTab = "workouts" | "subscription" | "nutrition";

export function ClientTabs({ athleteId, activeTab }: { athleteId: number; activeTab: ClientTab }) {
  const hrefs: Record<ClientTab, string> = {
    workouts: `/clients/${athleteId}`,
    subscription: `/clients/${athleteId}/subscription`,
    nutrition: `/clients/${athleteId}/nutrition`,
  };

  return (
    <TabNav
      label="Sezioni cliente"
      items={[
        { label: "Allenamenti", href: hrefs.workouts },
        { label: "Abbonamento", href: hrefs.subscription },
        { label: "Alimentazione", href: hrefs.nutrition },
      ]}
      activeHref={hrefs[activeTab]}
    />
  );
}

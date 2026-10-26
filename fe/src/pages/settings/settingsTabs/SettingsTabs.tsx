import { TabNav } from "@components/tabNav";

type SettingsTab = "account" | "offers";

const SETTINGS_TAB_HREFS: Record<SettingsTab, string> = {
  account: "/settings",
  offers: "/settings/offers",
};

const SETTINGS_TABS = [
  { label: "Account", href: SETTINGS_TAB_HREFS.account },
  { label: "Listino", href: SETTINGS_TAB_HREFS.offers },
];

/** `/profile` shows the account page too, so it passes "account". */
export function SettingsTabs({ activeTab }: { activeTab: SettingsTab }) {
  return (
    <TabNav
      label="Sezioni impostazioni"
      items={SETTINGS_TABS}
      activeHref={SETTINGS_TAB_HREFS[activeTab]}
    />
  );
}

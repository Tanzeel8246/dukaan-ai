import type { Metadata } from "next";
import SettingsView from "@/components/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your Dukaan AI shop profile, staff access, language and data.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/settings" },
  openGraph: {
    title: "Settings | Dukaan AI",
    description: "Shop profile, staff access, language and data settings.",
    url: "https://dukaan-ai.codehubb.com/settings",
  },
};

export default function SettingsPage() {
  return (
    <main>
      <SettingsView />
    </main>
  );
}

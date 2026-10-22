import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Dukaan AI — Smart Kiryana Shop Intelligence",
  description:
    "Your dukaan at a glance: stock value, low-stock alerts, today's sales and AI insights computed from your sales history.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/" },
  openGraph: {
    title: "Dukaan AI — Smart Kiryana Shop Intelligence",
    description: "Stock value, low-stock alerts, today's sales and AI insights for your kiryana store.",
    url: "https://dukaan-ai.codehubb.com/",
  },
  twitter: {
    card: "summary",
    title: "Dukaan AI — Smart Kiryana Shop Intelligence",
    description: "Stock value, low-stock alerts, today's sales and AI insights for your kiryana store.",
  },
};

export default function HomePage() {
  return (
    <main>
      <Dashboard />
    </main>
  );
}

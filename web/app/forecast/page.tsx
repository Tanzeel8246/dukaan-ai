import type { Metadata } from "next";
import ForecastView from "@/components/ForecastView";

export const metadata: Metadata = {
  title: "Forecast — Demand & Reorder Plan",
  description:
    "7-day moving-average demand forecast per product: days of stock left and suggested reorder quantities so your shelf never goes empty.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/forecast" },
  openGraph: {
    title: "Forecast — Demand & Reorder Plan | Dukaan AI",
    description: "7-day moving averages, days of stock left, and a smart reorder shopping list.",
    url: "https://dukaan-ai.codehubb.com/forecast",
  },
};

export default function ForecastPage() {
  return (
    <main>
      <ForecastView />
    </main>
  );
}

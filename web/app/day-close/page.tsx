import type { Metadata } from "next";
import DayCloseView from "@/components/DayCloseView";

export const metadata: Metadata = {
  title: "Day Close",
  description:
    "Close the day: auto-computed expected cash from sales, expenses, udhaar and supplier payments, compared against the cash you counted.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/day-close" },
  openGraph: {
    title: "Day Close | Dukaan AI",
    description: "Expected vs counted cash with a full day-close history.",
    url: "https://dukaan-ai.codehubb.com/day-close",
  },
};

export default function DayClosePage() {
  return (
    <main>
      <DayCloseView />
    </main>
  );
}

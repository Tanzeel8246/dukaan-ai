import type { Metadata } from "next";
import ReportsView from "@/components/ReportsView";

export const metadata: Metadata = {
  title: "Reports — Sales, Stock, Tax & Statements",
  description:
    "Thirteen reports over the shop's own derivations — sales, purchases, stock, profit & loss, cash book, tax, customer and supplier statements, aging, expenses, cheques, day closes and notes — printable and shareable in English or Urdu.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/reports" },
  openGraph: {
    title: "Reports | Dukaan AI",
    description:
      "Every figure in the shop on paper, in English or Urdu — save, print and share.",
    url: "https://dukaan-ai.codehubb.com/reports",
  },
};

export default function ReportsPage() {
  return (
    <main>
      <ReportsView />
    </main>
  );
}

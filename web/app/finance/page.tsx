import type { Metadata } from "next";
import FinanceView from "@/components/FinanceView";

export const metadata: Metadata = {
  title: "Finance — Cash Book & P&L",
  description:
    "Cash in hand, wallet balance, receivables and payables, monthly profit & loss, aging and the full cash book — all derived from the journal.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/finance" },
  openGraph: {
    title: "Finance — Cash Book & P&L | Dukaan AI",
    description: "Balances, monthly P&L, aging and cash book from the double-entry journal.",
    url: "https://dukaan-ai.codehubb.com/finance",
  },
};

export default function FinancePage() {
  return (
    <main>
      <FinanceView />
    </main>
  );
}

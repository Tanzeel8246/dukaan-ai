import type { Metadata } from "next";
import LoansView from "@/components/LoansView";

export const metadata: Metadata = {
  title: "Loans · Dukaan AI",
  description:
    "Loans register — money borrowed and lent, with derived schedules, desk-confirmed charge accruals and journal-posted repayments.",
};

export default function LoansPage() {
  return <LoansView />;
}

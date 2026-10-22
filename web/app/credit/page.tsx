import type { Metadata } from "next";
import CreditLedger from "@/components/CreditLedger";

export const metadata: Metadata = {
  title: "Credit — Udhaar Khata",
  description:
    "The udhaar khata: give credit, record repayments and see exactly who owes what — an append-only ledger grouped by customer.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/credit" },
  openGraph: {
    title: "Credit — Udhaar Khata | Dukaan AI",
    description: "Udhaar given, repayments received and outstanding balances per customer.",
    url: "https://dukaan-ai.codehubb.com/credit",
  },
};

export default function CreditPage() {
  return (
    <main>
      <CreditLedger />
    </main>
  );
}

import type { Metadata } from "next";
import BillingDesk from "@/components/BillingDesk";

export const metadata: Metadata = {
  title: "Billing — POS Desk",
  description:
    "Full POS billing desk: scan or pick items, take split payments (cash, JazzCash, EasyPaisa, bank or udhaar), hold and resume bills, print receipts and process returns.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/billing" },
  openGraph: {
    title: "Billing — POS Desk | Dukaan AI",
    description: "Build bills, take split payments, print receipts and handle returns.",
    url: "https://dukaan-ai.codehubb.com/billing",
  },
};

export default function BillingPage() {
  return (
    <main>
      <BillingDesk />
    </main>
  );
}

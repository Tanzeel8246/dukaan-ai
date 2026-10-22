import type { Metadata } from "next";
import CustomersDirectory from "@/components/CustomersDirectory";

export const metadata: Metadata = {
  title: "Customers",
  description:
    "Your customer directory: contact details, total purchased, udhaar outstanding, full purchase history and credit ledger per customer.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/customers" },
  openGraph: {
    title: "Customers | Dukaan AI",
    description: "Customer directory with purchase history and udhaar balances.",
    url: "https://dukaan-ai.codehubb.com/customers",
  },
};

export default function CustomersPage() {
  return (
    <main>
      <CustomersDirectory />
    </main>
  );
}

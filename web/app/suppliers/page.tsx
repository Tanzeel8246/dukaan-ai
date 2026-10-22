import type { Metadata } from "next";
import SuppliersManager from "@/components/SuppliersManager";

export const metadata: Metadata = {
  title: "Suppliers",
  description:
    "Manage suppliers, record purchases that restock your shelf, track payables and payments — purchased, paid and balance per supplier.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/suppliers" },
  openGraph: {
    title: "Suppliers | Dukaan AI",
    description: "Supplier directory, purchases, payments and payable balances.",
    url: "https://dukaan-ai.codehubb.com/suppliers",
  },
};

export default function SuppliersPage() {
  return (
    <main>
      <SuppliersManager />
    </main>
  );
}

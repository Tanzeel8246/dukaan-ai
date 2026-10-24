import type { Metadata } from "next";
import InventoryManager from "@/components/InventoryManager";

export const metadata: Metadata = {
  title: "Inventory — Stock Register",
  description:
    "Manage your business inventory: add, edit and delete products with SKU, stock, cost and sale prices. Low-stock rows are highlighted automatically.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/inventory" },
  openGraph: {
    title: "Inventory — Stock Register | Dukaan AI",
    description: "Add, edit and delete products. Low-stock rows highlighted automatically.",
    url: "https://dukaan-ai.codehubb.com/inventory",
  },
};

export default function InventoryPage() {
  return (
    <main>
      <InventoryManager />
    </main>
  );
}

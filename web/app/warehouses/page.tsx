import type { Metadata } from "next";
import WarehousesView from "@/components/WarehousesView";

export const metadata: Metadata = {
  title: "Warehouses · Dukaan AI",
  description:
    "The shop's stock locations — every product's total split across warehouses, with per-warehouse on-hand, promised and available figures, and a recount that repairs the split without touching the accounts.",
};

export default function WarehousesPage() {
  return <WarehousesView />;
}

import type { Metadata } from "next";
import { PurchaseOrdersManager } from "@/components/DocumentViews";

export const metadata: Metadata = {
  title: "Purchase Orders · Dukaan AI",
  description:
    "Orders placed with suppliers — a purchase order posts nothing until goods are received against it through the purchase book.",
};

export default function PurchaseOrdersPage() {
  return <PurchaseOrdersManager />;
}

import type { Metadata } from "next";
import { SaleOrdersManager } from "@/components/DocumentViews";

export const metadata: Metadata = {
  title: "Sale Orders · Dukaan AI",
  description:
    "Confirmed sale orders with derived fulfilment — convert an order into a bill at the billing desk whenever the goods go out.",
};

export default function SaleOrdersPage() {
  return <SaleOrdersManager />;
}

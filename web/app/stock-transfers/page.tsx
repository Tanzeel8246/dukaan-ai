import type { Metadata } from "next";
import TransfersView from "@/components/TransfersView";

export const metadata: Metadata = {
  title: "Stock Transfers · Dukaan AI",
  description:
    "Move stock between the shop's own warehouses — dispatch puts goods on the road, receiving lands them at the destination, and only a proven shortage posts to the accounts.",
};

export default function StockTransfersPage() {
  return <TransfersView />;
}

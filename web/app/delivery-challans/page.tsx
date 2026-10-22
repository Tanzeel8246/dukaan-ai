import type { Metadata } from "next";
import { DeliveryChallansManager } from "@/components/DocumentViews";

export const metadata: Metadata = {
  title: "Delivery Challans · Dukaan AI",
  description:
    "Delivery challans record what left the shop on each trip — quantities only, no prices. Stock and money move only when the delivery is billed.",
};

export default function DeliveryChallansPage() {
  return <DeliveryChallansManager />;
}

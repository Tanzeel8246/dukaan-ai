import type { Metadata } from "next";
import StorefrontView from "@/components/StorefrontView";

export const metadata: Metadata = {
  title: "Online Store · Dukaan AI",
  description:
    "The shop's public storefront: a published price-and-availability snapshot customers order from, and the inbox those orders land in — paper until a member converts one into a sale order.",
};

export default function StorefrontPage() {
  return <StorefrontView />;
}

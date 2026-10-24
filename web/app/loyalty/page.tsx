import type { Metadata } from "next";
import LoyaltyView from "@/components/LoyaltyView";

export const metadata: Metadata = {
  title: "Loyalty Points · Dukaan AI",
  description:
    "Customer loyalty points as the liability they are — earned, spent, returned and expired points folded from the ledger, with expiry releases posted deliberately by the owner.",
};

export default function LoyaltyPage() {
  return <LoyaltyView />;
}

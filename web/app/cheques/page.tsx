import type { Metadata } from "next";
import ChequesView from "@/components/ChequesView";

export const metadata: Metadata = {
  title: "Cheque Registry · Dukaan AI",
  description:
    "Every cheque received or issued by the shop — captured with its payment, deposited, cleared or bounced, with the registry always equal to the ledger's cheque balances.",
};

export default function ChequesPage() {
  return <ChequesView />;
}

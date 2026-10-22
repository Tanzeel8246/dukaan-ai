import type { Metadata } from "next";
import { QuotationsManager } from "@/components/DocumentViews";

export const metadata: Metadata = {
  title: "Quotations · Dukaan AI",
  description:
    "Price quotations and estimates for customers — quotations never touch stock or the ledger until they become orders and bills.",
};

export default function QuotationsPage() {
  return <QuotationsManager />;
}

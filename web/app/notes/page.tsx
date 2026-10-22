import type { Metadata } from "next";
import { NotesManager } from "@/components/NotesViews";

export const metadata: Metadata = {
  title: "Credit & Debit Notes · Dukaan AI",
  description:
    "Formal credit notes for bill returns and debit notes for goods returned to suppliers — each note wraps the return posting in the ledger.",
};

export default function NotesPage() {
  return <NotesManager />;
}

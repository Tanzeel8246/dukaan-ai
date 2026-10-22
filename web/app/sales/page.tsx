import type { Metadata } from "next";
import SalesRecorder from "@/components/SalesRecorder";

export const metadata: Metadata = {
  title: "Sales — Daily Counter",
  description:
    "Record sales in one tap: pick a product and quantity, stock decrements instantly. See today's revenue, profit and full sales list.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/sales" },
  openGraph: {
    title: "Sales — Daily Counter | Dukaan AI",
    description: "Record sales, watch stock decrement, track today's revenue and profit.",
    url: "https://dukaan-ai.codehubb.com/sales",
  },
};

export default function SalesPage() {
  return (
    <main>
      <SalesRecorder />
    </main>
  );
}

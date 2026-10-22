import type { Metadata } from "next";
import ExpensesRegister from "@/components/ExpensesRegister";

export const metadata: Metadata = {
  title: "Expenses — Income & Khata",
  description:
    "Track shop expenses by category alongside sales income: today's and this month's totals, month net, and a full expense register.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/expenses" },
  openGraph: {
    title: "Expenses — Income & Khata | Dukaan AI",
    description: "Expense register with income comparison and month net.",
    url: "https://dukaan-ai.codehubb.com/expenses",
  },
};

export default function ExpensesPage() {
  return (
    <main>
      <ExpensesRegister />
    </main>
  );
}

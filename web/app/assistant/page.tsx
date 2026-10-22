import type { Metadata } from "next";
import AssistantChat from "@/components/AssistantChat";

export const metadata: Metadata = {
  title: "AI Assistant — Ask in Urdu or English",
  description:
    "Chat with Dukaan AI in Urdu or English: check stock, list items running low, see today's sales or get reorder advice — computed live from your shop data.",
  alternates: { canonical: "https://dukaan-ai.codehubb.com/assistant" },
  openGraph: {
    title: "AI Assistant — Ask in Urdu or English | Dukaan AI",
    description: "Bilingual AI chat that answers from your own shop data — stock, sales, forecasts.",
    url: "https://dukaan-ai.codehubb.com/assistant",
  },
};

export default function AssistantPage() {
  return (
    <main>
      <AssistantChat />
    </main>
  );
}

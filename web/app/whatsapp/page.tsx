import type { Metadata } from "next";
import WhatsAppView from "@/components/WhatsAppView";

export const metadata: Metadata = {
  title: "WhatsApp Marketing · Dukaan AI",
  description:
    "Consent-first WhatsApp marketing: campaigns to opted-in customers, sent one by one by the shopkeeper through a disciplined queue — the log records only what he confirms he sent.",
};

export default function WhatsAppPage() {
  return <WhatsAppView />;
}

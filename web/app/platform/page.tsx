import type { Metadata } from "next";
import PlatformConsole from "@/components/PlatformConsole";

export const metadata: Metadata = {
  title: "Platform · Dukaan AI",
};

/**
 * Phase G · G3: the super admin console — its own route tree
 * with its own minimal shell (AppShell renders the platform
 * branch here, never the shop navigation). Access is the
 * platformAdmins/{uid} doc; everyone else gets the console's
 * plain not-authorized page.
 */
export default function PlatformPage() {
  return <PlatformConsole />;
}

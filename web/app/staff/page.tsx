import type { Metadata } from "next";
import StaffView from "@/components/StaffView";

export const metadata: Metadata = {
  title: "Staff · Dukaan AI",
  description:
    "Employee directory and attendance register — terms, tap-to-mark attendance, and journal-derived salary positions.",
};

export default function StaffPage() {
  return <StaffView />;
}

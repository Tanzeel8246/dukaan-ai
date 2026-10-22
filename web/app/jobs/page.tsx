import type { Metadata } from "next";
import JobsView from "@/components/JobsView";

export const metadata: Metadata = {
  title: "Jobs · Dukaan AI",
  description:
    "Work orders and service jobs — intake, stages, materials, advances and billing from one card.",
};

export default function JobsPage() {
  return <JobsView />;
}

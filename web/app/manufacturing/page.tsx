import type { Metadata } from "next";
import ManufacturingView from "@/components/ManufacturingView";

export const metadata: Metadata = {
  title: "Manufacturing · Dukaan AI",
  description:
    "BOM recipes for the products you make — versioned recipes with per-batch components, labour and overhead, and the standard cost of every finished unit.",
};

export default function ManufacturingPage() {
  return <ManufacturingView />;
}

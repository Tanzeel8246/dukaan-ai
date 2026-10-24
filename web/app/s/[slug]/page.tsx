import type { Metadata } from "next";
import StorefrontPublicView from "@/components/StorefrontPublicView";

/**
 * Phase H · H3 — the public store route (design §2.3).
 *
 * The static export emits exactly one path from here: the
 * §5.3 labelled demo preview at /s/demo. A server-rendered
 * deployment resolves real slugs on demand; the page itself
 * reads ONLY the published snapshot for its slug, client-side,
 * under the v10 rules' public leg.
 */
export function generateStaticParams() {
  return [{ slug: "demo" }];
}

export const metadata: Metadata = {
  title: "Store · Dukaan AI",
  description:
    "A neighbourhood shop's published catalogue — prices and availability as the shop last published them, with ordering straight to the shop's inbox.",
};

export default async function StorefrontPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StorefrontPublicView slug={slug} />;
}

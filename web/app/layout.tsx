import type { Metadata } from "next";
import Script from "next/script";
import { Baloo_2, Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthProvider";
import { StoreProvider } from "@/components/StoreProvider";
import { LangProvider } from "@/components/LangProvider";
import { JsonLd } from "@/components/ui";

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const urdu = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  subsets: ["arabic"],
  weight: ["400", "500"],
});

const SITE_URL = "https://dukaan-ai.codehubb.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dukaan AI — Smart Kiryana Shop Intelligence",
    template: "%s | Dukaan AI",
  },
  description:
    "Dukaan AI is a smart inventory, sales and demand-forecasting assistant for kiryana stores — with a bilingual Urdu/English AI chat that answers from your own shop data.",
  keywords: [
    "kiryana store software",
    "dukaan AI",
    "inventory management Pakistan",
    "demand forecasting",
    "shop POS",
    "Urdu AI assistant",
  ],
  authors: [{ name: "CodeHubb" }],
  creator: "CodeHubb",
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Dukaan AI",
    title: "Dukaan AI — Smart Kiryana Shop Intelligence",
    description:
      "Inventory, sales tracking and demand forecasting for kiryana stores — with a bilingual AI assistant.",
  },
  twitter: {
    card: "summary",
    title: "Dukaan AI — Smart Kiryana Shop Intelligence",
    description:
      "Inventory, sales tracking and demand forecasting for kiryana stores — with a bilingual AI assistant.",
  },
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dukaan AI",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Smart inventory, sales tracking and demand forecasting for kiryana stores, with a bilingual Urdu/English AI assistant.",
  creator: {
    "@type": "Organization",
    name: "CodeHubb",
    url: "https://codehubb.com",
  },
  offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" },
  inLanguage: ["en", "ur"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ur"
      dir="rtl"
      suppressHydrationWarning
      className={`${baloo.variable} ${inter.variable} ${urdu.variable}`}
    >
      <Script
        id="theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('dukaan-ai-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`,
        }}
      />
      <Script
        id="lang-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var l=localStorage.getItem('dukaan-ai-lang');if(l!=='ur'&&l!=='en'){l='ur';}document.documentElement.lang=l;document.documentElement.dir=l==='ur'?'rtl':'ltr';}catch(e){document.documentElement.lang='ur';document.documentElement.dir='rtl';}})();`,
        }}
      />
      <body>
        <JsonLd data={softwareAppJsonLd} />
        <LangProvider>
          <AuthProvider>
            <StoreProvider>
              <AppShell>{children}</AppShell>
            </StoreProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}

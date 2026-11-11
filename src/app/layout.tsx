import type { Metadata } from "next";
import { Cormorant_Garamond, Lato, Lora, Montserrat, Nothing_You_Could_Do } from "next/font/google";
import { getSiteContent } from "@/lib/site-content";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});
const body = Lora({ variable: "--font-body", subsets: ["latin"], style: ["normal", "italic"] });
const label = Montserrat({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500", "600"] });
// Fonte "Moderna" dos títulos de galeria (não precarrega: só as galerias usam).
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"], preload: false });
const script = Nothing_You_Could_Do({ variable: "--font-script", subsets: ["latin"], weight: "400" });

export async function generateMetadata(): Promise<Metadata> {
  const c = await getSiteContent();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return {
    // Base dos links e imagens de prévia (WhatsApp, redes).
    metadataBase: new URL(host ? `https://${host}` : "http://localhost:3000"),
    title: { default: c.brand, template: `%s · ${c.brand}` },
    description: c.introText,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${body.variable} ${label.variable} ${script.variable} ${lato.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Cormorant_Garamond, Lora, Montserrat, Nothing_You_Could_Do } from "next/font/google";
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
const script = Nothing_You_Could_Do({ variable: "--font-script", subsets: ["latin"], weight: "400" });

export async function generateMetadata(): Promise<Metadata> {
  const c = await getSiteContent();
  const name = c.brand.charAt(0) + c.brand.slice(1).toLowerCase();
  return {
    title: { default: `${name} · Fotografia`, template: `%s · ${name}` },
    description: c.introText,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${label.variable} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}

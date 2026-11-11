import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { getSiteContent } from "@/lib/site-content";
import { logout } from "@/app/actions/auth";
import { ClientNav } from "@/components/ClientNav";
import { Logo } from "@/components/Logo";
import "../panel.css";

export const metadata: Metadata = { title: { default: "Minhas galerias", template: "%s" }, robots: { index: false } };

export default async function ClientLayout({ children }: LayoutProps<"/cliente">) {
  const [user, c] = await Promise.all([requireClient(), getSiteContent()]);
  return (
    <div className="client">
      <header className="client-head">
        <ClientNav />
        <Link href="/" className="client-brand"><Logo name={c.brand} height={64} /></Link>
        <div className="right">
          <span>{user.name.split(" ")[0]}</span>
          <form action={logout}>
            <button className="linklike">Sair</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}

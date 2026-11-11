import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { getSiteContent } from "@/lib/site-content";
import { logout } from "@/app/actions/auth";
import { SideNav } from "@/components/admin/SideNav";
import { Logo } from "@/components/Logo";
import "../panel.css";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const [c, unread] = await Promise.all([
    getSiteContent(),
    one<{ n: string }>("select count(*) n from inquiries where not read"),
  ]);
  return (
    <div className="panel">
      <aside className="side">
        <Link href="/admin" className="side-brand">
          <Logo name={c.brand} height={76} />
          <small>Painel</small>
        </Link>
        <SideNav unread={Number(unread?.n ?? 0)} />
        <div className="side-foot">
          <span>
            <strong>{user.name}</strong>
            {user.email}
          </span>
          <Link href="/" className="linklike">Ver o site</Link>
          <form action={logout}>
            <button className="linklike">Sair</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

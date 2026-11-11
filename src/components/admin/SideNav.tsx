"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Início" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/galerias", label: "Galerias" },
  { href: "/admin/mensagens", label: "Mensagens" },
  { href: "/admin/site", label: "Site" },
  { href: "/admin/conta", label: "Minha conta" },
] as const;

export function SideNav({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="side-nav" aria-label="Painel">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
            {l.href === "/admin/mensagens" && unread > 0 && <span className="side-count">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

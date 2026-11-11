"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ClientNav() {
  const path = usePathname();
  return (
    <nav aria-label="Área do cliente">
      <Link href="/cliente" aria-current={path !== "/cliente/conta" ? "page" : undefined}>Galerias</Link>
      <Link href="/cliente/conta" aria-current={path === "/cliente/conta" ? "page" : undefined}>Minha conta</Link>
    </nav>
  );
}

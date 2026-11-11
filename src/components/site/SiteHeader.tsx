"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "#sobre", label: "Sobre", id: "sobre" },
  { href: "#servicos", label: "Pacotes", id: "servicos" },
  { href: "#portfolio", label: "Portfólio", id: "portfolio" },
  { href: "#contato", label: "Contato", id: "contato" },
];

/** Link com as letras rolando para cima, uma a uma. */
function RollLink({ href, label, active, onClick }: { href: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <a href={href} className="roll" aria-current={active ? "true" : undefined} onClick={onClick}>
      <span className="roll-text" aria-hidden="true">
        {[...label].map((ch, i) => (
          <span key={i} className="ch" style={{ "--i": i } as React.CSSProperties}>
            {ch === " " ? " " : ch}
          </span>
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </a>
  );
}

/** Selo redondo: a logo segue o mouse quando ele chega perto, inclina, brilha e ganha um anel de texto girando. */
function Seal({ brand }: { brand: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let target = { x: 0, y: 0, p: 0 };
    const cur = { x: 0, y: 0, p: 0, a: 0 };
    let running = false;

    const tick = () => {
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      cur.p += (target.p - cur.p) * 0.1;
      cur.a = (cur.a + 0.08 + cur.p * 0.9) % 360;
      el.style.setProperty("--mx", cur.x.toFixed(2));
      el.style.setProperty("--my", cur.y.toFixed(2));
      el.style.setProperty("--p", cur.p.toFixed(3));
      el.style.setProperty("--a", `${cur.a.toFixed(2)}deg`);
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) + Math.abs(target.p - cur.p) > 0.002 || cur.p > 0.01) {
        raf = requestAnimationFrame(tick);
      } else running = false;
    };
    const start = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const p = Math.max(0, 1 - d / 320);
      // Puxa a logo na direção do mouse (efeito magnético).
      const pull = still ? 0 : Math.min(d, 120) * 0.12 * p;
      target = { x: (dx / Math.max(d, 1)) * pull, y: (dy / Math.max(d, 1)) * pull, p };
      start();
    };
    const onLeave = () => {
      target = { x: 0, y: 0, p: 0 };
      start();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const ring = "VICTOR & DUDA · FOTOGRAFIA · VICTOR & DUDA · FOTOGRAFIA · ";
  return (
    <Link
      href="/"
      ref={ref}
      className={`seal${flash ? " flash" : ""}`}
      onPointerEnter={() => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash(false);
        requestAnimationFrame(() => setFlash(true));
        flashTimer.current = setTimeout(() => setFlash(false), 1100);
      }}
      aria-label={brand}
    >
      <svg className="seal-ring" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <path id="seal-path" d="M100,100 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0" />
        </defs>
        <text>
          <textPath href="#seal-path" textLength="536" lengthAdjust="spacing">{ring}</textPath>
        </text>
      </svg>
      <span className="seal-logo">
        <img src="/brand/logo.png" alt="" width={105} height={122} />
        <span className="seal-shine" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function SiteHeader({ brand, clientHref, clientLabel }: { brand: string; clientHref: string; clientLabel: string }) {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  // Barra fixa depois que a capa sai da tela.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Marca no menu a seção que está na tela.
  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Menu do celular: trava a rolagem e fecha com Esc.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const nav = (cls: string) => (
    <nav className={cls} aria-label="Principal">
      {LINKS.slice(0, 2).map((l) => (
        <RollLink key={l.id} {...l} active={active === l.id} />
      ))}
      {cls === "masthead-nav" && <span className="masthead-gap" aria-hidden="true" />}
      {LINKS.slice(2).map((l) => (
        <RollLink key={l.id} {...l} active={active === l.id} />
      ))}
    </nav>
  );

  const Burger = (
    <button type="button" className={`burger${open ? " is-open" : ""}`} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      <span />
      <span />
      <span />
    </button>
  );

  return (
    <>
      <header className="masthead">
        {nav("masthead-nav")}
        <Seal brand={brand} />
        <div className="masthead-burger">{Burger}</div>
      </header>

      <div className={`stickybar${stuck ? " is-on" : ""}`} aria-hidden={!stuck}>
        <a href="#" className="stickybar-logo" tabIndex={stuck ? 0 : -1} aria-label="Voltar ao topo">
          <img src="/brand/logo.png" alt="" width={36} height={42} />
        </a>
        {nav("stickybar-nav")}
        <Link href={clientHref} className="btn btn-solid btn-sm stickybar-cta" tabIndex={stuck ? 0 : -1}>
          {clientLabel}
        </Link>
        <div className="stickybar-burger">{Burger}</div>
      </div>

      <div className={`mobile-menu${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="mobile-menu-close">
          <button type="button" className="burger is-open" aria-label="Fechar menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
            <span />
            <span />
            <span />
          </button>
        </div>
        <nav aria-label="Menu">
          {LINKS.map((l, i) => (
            <a key={l.id} href={l.href} style={{ "--i": i } as React.CSSProperties} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              {l.label}
            </a>
          ))}
          <Link href={clientHref} style={{ "--i": LINKS.length } as React.CSSProperties} className="mobile-menu-client" tabIndex={open ? 0 : -1}>
            {clientLabel}
          </Link>
        </nav>
        <img src="/brand/logo.png" alt="" className="mobile-menu-logo" width={70} height={81} />
      </div>
    </>
  );
}

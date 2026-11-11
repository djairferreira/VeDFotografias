"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "vd-whats-pos";
const SIZE = 62;
const EDGE = 18;

type Pos = { side: "left" | "right"; y: number }; // y = distância do fundo, em px

/** Botão flutuante do WhatsApp: arrastável, gruda na lateral mais próxima e lembra a posição. */
export function WhatsAppButton({ href }: { href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [pos, setPos] = useState<Pos>({ side: "right", y: 24 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [tip, setTip] = useState(false);
  const moved = useRef(false);
  const start = useRef({ px: 0, py: 0, x: 0, y: 0 });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      // Lido depois da hidratação: o servidor não conhece a posição salva no navegador.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved?.side && typeof saved.y === "number") setPos(saved);
    } catch {}
    const show = setTimeout(() => setTip(true), 4200);
    const hide = setTimeout(() => setTip(false), 11000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  const clampY = (y: number) => Math.min(Math.max(y, EDGE), window.innerHeight - SIZE - EDGE);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const r = ref.current!.getBoundingClientRect();
    start.current = { px: e.clientX, py: e.clientY, x: r.left, y: r.top };
    moved.current = false;
    ref.current!.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ref.current?.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - start.current.px;
    const dy = e.clientY - start.current.py;
    if (!moved.current && Math.hypot(dx, dy) < 6) return;
    moved.current = true;
    setTip(false);
    setDrag({
      x: Math.min(Math.max(start.current.x + dx, 4), window.innerWidth - SIZE - 4),
      y: Math.min(Math.max(start.current.y + dy, 4), window.innerHeight - SIZE - 4),
    });
  };
  const onUp = (e: React.PointerEvent) => {
    if (ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
    if (!drag) return;
    const side = drag.x + SIZE / 2 < window.innerWidth / 2 ? "left" : "right";
    const next = { side, y: clampY(window.innerHeight - drag.y - SIZE) } as Pos;
    setDrag(null);
    setPos(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const style: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y, right: "auto", bottom: "auto", transition: "none" }
    : pos.side === "right"
      ? { right: `calc(${EDGE}px + env(safe-area-inset-right, 0px))`, bottom: `calc(${pos.y}px + env(safe-area-inset-bottom, 0px))` }
      : { left: `calc(${EDGE}px + env(safe-area-inset-left, 0px))`, bottom: `calc(${pos.y}px + env(safe-area-inset-bottom, 0px))` };

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`whats${drag ? " is-dragging" : ""} side-${pos.side}`}
      style={style}
      aria-label="Pedir orçamento pelo WhatsApp"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={(e) => {
        // Depois de arrastar, soltar não abre a conversa.
        if (moved.current) {
          e.preventDefault();
          moved.current = false;
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <span className="whats-ring" aria-hidden="true" />
      <span className="whats-ring whats-ring-2" aria-hidden="true" />
      <svg viewBox="0 0 32 32" aria-hidden="true" className="whats-icon">
        <path
          fill="currentColor"
          d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 6.9L3.2 29l6.5-1.7c1.9 1 4.1 1.6 6.3 1.6 7.2 0 13-5.7 13-12.8C29 8.7 23.2 3 16 3zm0 23.5c-2 0-4-.5-5.6-1.5l-.4-.2-3.9 1 1-3.7-.3-.4c-1.1-1.7-1.7-3.6-1.7-5.7C5.1 10 10 5.2 16 5.2S26.9 10 26.9 15.8 22 26.5 16 26.5z"
        />
        <path
          fill="currentColor"
          d="M22.1 18.6c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.5 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.4 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z"
        />
      </svg>
      <span className={`whats-tip${tip ? " is-on" : ""}`} aria-hidden="true">
        Peça seu orçamento
      </span>
    </a>
  );
}

"use client";

import { useEffect } from "react";

/** Revela na rolagem os elementos com data-reveal. Sem JavaScript tudo já aparece. */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    // Só esconde o que ainda está abaixo da tela; o que já está visível não pisca.
    const below = els.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    below.forEach((el) => el.classList.add("rv-wait"));
    root.classList.add("rv-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("rv-in");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    below.forEach((el) => io.observe(el));

    // Parallax leve nas fotos grandes.
    const par = reduce ? [] : Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        for (const el of par) {
          const r = el.getBoundingClientRect();
          const k = Number(el.dataset.parallax) || 0.08;
          const off = (r.top + r.height / 2 - window.innerHeight / 2) * -k;
          el.style.setProperty("--py", `${off.toFixed(1)}px`);
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

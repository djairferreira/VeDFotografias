"use client";

import { useState } from "react";
import type { Testimonial } from "@/lib/site-content";
import { Rich } from "./Rich";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [i, setI] = useState(0);
  if (!items.length) return null;
  const t = items[i % items.length];
  const go = (d: number) => setI((v) => (v + d + items.length) % items.length);
  return (
    <div className="quote">
      <div className="quote-row">
        <button type="button" className="quote-arrow" aria-label="Depoimento anterior" onClick={() => go(-1)}>
          <svg viewBox="0 0 34 10" aria-hidden="true"><path d="M33 5H2M6 1 2 5l4 4" /></svg>
        </button>
        <h3 className="quote-title" key={`t${i}`}>
          <Rich text={t.title} />
        </h3>
        <button type="button" className="quote-arrow" aria-label="Próximo depoimento" onClick={() => go(1)}>
          <svg viewBox="0 0 34 10" aria-hidden="true"><path d="M1 5h31M28 1l4 4-4 4" /></svg>
        </button>
      </div>
      <p className="quote-text" key={`q${i}`}>{t.quote}</p>
      <p className="quote-author">- {t.author}</p>
    </div>
  );
}

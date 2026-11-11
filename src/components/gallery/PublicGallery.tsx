"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cover } from "./Cover";
import type { Design } from "@/lib/gallery-design";

export type GPhoto = { id: string; w: number | null; h: number | null; c: string | null; f: string };
export type GCategory = { id: string; name: string };

const Icon = {
  down: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M6.5 10 12 15.5 17.5 10M4 20h16" /></svg>,
  share: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>,
  left: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" /></svg>,
  right: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg>,
  link: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
};

export function PublicGallery({
  slug,
  title,
  subtitle,
  brand,
  design,
  coverId,
  photos,
  categories,
}: {
  slug: string;
  title: string;
  subtitle: string;
  brand: string;
  design: Design;
  coverId: string | null;
  photos: GPhoto[];
  categories: GCategory[];
}) {
  const src = (id: string, v: "mini" | "tela" | "original") => `/api/p/${slug}/${id}/${v}`;
  const tabs = useMemo(() => {
    const t = categories.filter((c) => photos.some((p) => p.c === c.id));
    if (t.length && photos.some((p) => !p.c || !t.find((c) => c.id === p.c))) t.push({ id: "_outras", name: "Outras" });
    return t;
  }, [categories, photos]);
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  const shown = useMemo(
    () => (!tab ? photos : tab === "_outras" ? photos.filter((p) => !p.c || !tabs.find((c) => c.id === p.c)) : photos.filter((p) => p.c === tab)),
    [photos, tab, tabs],
  );
  const [open, setOpen] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Abre direto numa foto quando o link tem ?foto=id.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("foto");
    if (!id) return;
    const p = photos.find((x) => x.id === id);
    if (!p) return;
    const t = tabs.find((c) => c.id === p.c)?.id ?? (tabs.length ? "_outras" : "");
    const list = !t ? photos : t === "_outras" ? photos.filter((x) => !x.c || !tabs.find((c) => c.id === x.c)) : photos.filter((x) => x.c === t);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o endereço só no navegador
    setTab(t);
    setOpen(list.findIndex((x) => x.id === id));
  }, [photos, tabs]);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + shown.length) % shown.length)), [shown.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const next = shown[(open + 1) % shown.length];
    if (next) new Image().src = src(next.id, "tela");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, shown]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  async function share(photo?: GPhoto) {
    const url = `${location.origin}/galeria/${slug}${photo ? `?foto=${photo.id}` : ""}`;
    try {
      if (photo && navigator.canShare) {
        const blob = await (await fetch(src(photo.id, "tela"))).blob();
        const file = new File([blob], photo.f.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text: `${title} · ${brand}` });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title, text: `${title} · ${brand}`, url });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copiado");
    } catch {
      flash(url);
    }
  }

  // Deslizar para os lados no celular.
  const touch = useRef<number | null>(null);
  const current = open !== null ? shown[open] : null;
  const zipHref = `/api/p/${slug}/zip${tab && tab !== "_outras" ? `?categoria=${tab}` : ""}`;

  return (
    <div className="gpage">
      <Cover image={coverId ? src(coverId, "tela") : null} design={design} title={title} subtitle={subtitle} brand={brand} buttonHref="#fotos" />

      <div className="gbar" id="fotos">
        <div className="gbar-title">
          <strong>{title}</strong>
          <span>{brand}</span>
        </div>
        <div className="gbar-actions">
          <a className="gicon" href={zipHref} title={tab && tab !== "_outras" ? "Baixar esta categoria" : "Baixar todas"} aria-label="Baixar fotos em .zip">
            {Icon.down}
          </a>
          <button type="button" className="gicon" onClick={() => share()} title="Compartilhar galeria" aria-label="Compartilhar galeria">
            {Icon.share}
          </button>
        </div>
      </div>

      {tabs.length > 0 && (
        <nav className="gtabs" ref={tabsRef} aria-label="Categorias">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? "is-on" : ""}
              onClick={(e) => {
                setTab(t.id);
                e.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
              }}
            >
              {t.name}
            </button>
          ))}
        </nav>
      )}

      <div className="gmasonry" key={tab}>
        {shown.map((p, i) => (
          <button key={p.id} type="button" className="gtile" onClick={() => setOpen(i)} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
            <img src={src(p.id, "mini")} alt="" loading="lazy" decoding="async" width={p.w ?? 600} height={p.h ?? 800} />
          </button>
        ))}
      </div>
      {!shown.length && <p className="gempty">As fotos estão sendo preparadas.</p>}

      <footer className="gfoot">
        <img src="/brand/logo.png" alt={brand} width={64} height={74} />
        <span>{brand}</span>
      </footer>

      {current && (
        <div
          className="gbox"
          role="dialog"
          aria-modal="true"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          <div className="gbox-top">
            <span>
              {open! + 1} / {shown.length}
            </span>
            <div className="gbox-actions">
              <a className="gicon" href={src(current.id, "original")} aria-label="Baixar em qualidade máxima" title="Baixar em qualidade máxima">
                {Icon.down}
              </a>
              <button type="button" className="gicon" onClick={() => share(current)} aria-label="Compartilhar foto" title="Compartilhar">
                {Icon.share}
              </button>
              <button type="button" className="gicon" onClick={() => setOpen(null)} aria-label="Fechar">
                {Icon.close}
              </button>
            </div>
          </div>
          <div className="gbox-stage" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            <img key={current.id} src={src(current.id, "tela")} alt="" />
            <button type="button" className="gbox-nav prev" onClick={() => step(-1)} aria-label="Anterior">{Icon.left}</button>
            <button type="button" className="gbox-nav next" onClick={() => step(1)} aria-label="Próxima">{Icon.right}</button>
          </div>
          <div className="gbox-bottom">
            <a className="gbtn" href={src(current.id, "original")}>
              {Icon.down} Baixar em alta
            </a>
            <button type="button" className="gbtn gbtn-ghost" onClick={() => share(current)}>
              {Icon.share} Compartilhar
            </button>
          </div>
        </div>
      )}

      {toast && <div className="gtoast" role="status">{toast}</div>}
    </div>
  );
}

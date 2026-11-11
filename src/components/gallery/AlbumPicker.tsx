"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cover } from "./Cover";
import type { Design } from "@/lib/gallery-design";
import type { GCategory } from "./PublicGallery";

export type APhoto = { id: string; w: number | null; h: number | null; c: string | null; s: boolean };

const Heart = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 20.5s-7.5-4.6-9.3-9.3C1.5 8 3.6 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.5 3.5 4.3 6.7-1.8 4.7-9.3 9.3-9.3 9.3z"
      fill={on ? "currentColor" : "none"}
    />
  </svg>
);

export function AlbumPicker({
  slug,
  title,
  subtitle,
  brand,
  design,
  coverId,
  limit,
  photos: initial,
  categories,
  submitted,
}: {
  slug: string;
  title: string;
  subtitle: string;
  brand: string;
  design: Design;
  coverId: string | null;
  limit: number;
  photos: APhoto[];
  categories: GCategory[];
  submitted: { at: string; name: string | null } | null;
}) {
  const src = (id: string, v: "mini" | "tela") => `/api/p/${slug}/${id}/${v}`;
  const [photos, setPhotos] = useState(initial);
  const [sent, setSent] = useState(submitted);
  const count = photos.filter((p) => p.s).length;
  const [onlyChosen, setOnlyChosen] = useState(!!submitted);
  const tabs = useMemo(() => categories.filter((c) => photos.some((p) => p.c === c.id)), [categories, photos]);
  const [tab, setTab] = useState("");
  const shown = useMemo(
    () => photos.filter((p) => (!onlyChosen || p.s) && (!tab || p.c === tab)),
    [photos, onlyChosen, tab],
  );
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [shield, setShield] = useState(false);
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = !!sent;

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3200);
  };

  async function toggle(p: APhoto) {
    if (locked) return;
    const next = !p.s;
    if (next && limit && count >= limit) {
      flash(`Você já escolheu as ${limit} fotos. Desmarque uma para trocar.`);
      return;
    }
    setPhotos((list) => list.map((x) => (x.id === p.id ? { ...x, s: next } : x)));
    const res = await fetch(`/api/p/${slug}/selecao`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ photoId: p.id, selected: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setPhotos((list) => list.map((x) => (x.id === p.id ? { ...x, s: !next } : x)));
      const body = await res?.json().catch(() => null);
      flash(body?.error ?? "Não consegui salvar. Confira a internet e tente de novo.");
    }
  }

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/p/${slug}/selecao`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enviar: true, name, note }),
    }).catch(() => null);
    setBusy(false);
    const body = await res?.json().catch(() => null);
    if (!res?.ok) return flash(body?.error ?? "Não consegui enviar. Tente de novo.");
    setAsking(false);
    setSent({ at: new Date().toISOString(), name });
    setOnlyChosen(true);
    window.scrollTo({ top: document.getElementById("fotos")?.offsetTop ?? 0, behavior: "smooth" });
  }

  // Proteção: sem menu do botão direito, sem arrastar, sem imprimir; a foto some quando a janela perde o foco.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "printscreen" || ((e.metaKey || e.ctrlKey) && ["p", "s"].includes(k)) || (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k))) {
        e.preventDefault();
        setShield(true);
        navigator.clipboard?.writeText("").catch(() => {});
        setTimeout(() => setShield(false), 1500);
      }
    };
    const hide = () => setShield(true);
    const show = () => setShield(false);
    const vis = () => setShield(document.visibilityState !== "visible");
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", show);
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", show);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

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
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  const touch = useRef<number | null>(null);
  const current = open !== null ? shown[open] : null;
  const pct = limit ? Math.min(100, (count / limit) * 100) : 0;

  return (
    <div className={`gpage apage${shield ? " is-shielded" : ""}`}>
      <Cover
        image={coverId ? src(coverId, "tela") : null}
        design={{ ...design, button: locked ? "Ver minha seleção" : design.button === "Ver galeria" ? "Escolher fotos" : design.button }}
        title={title}
        subtitle={subtitle}
        brand={brand}
        buttonHref="#fotos"
      />

      <section className="aintro">
        {locked ? (
          <>
            <p className="eyebrow">Seleção enviada</p>
            <h2>Recebemos as suas {count} fotos</h2>
            <p>
              Enviada {sent?.name ? `por ${sent.name} ` : ""}em {new Date(sent!.at).toLocaleDateString("pt-BR")}. Para trocar alguma, fale com a gente que reabrimos a escolha.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">Como funciona</p>
            <h2>Escolha {limit ? `${limit} fotos` : "suas fotos"} para o álbum</h2>
            <p>
              Toque no coração para marcar. As escolhas ficam salvas sozinhas: você pode parar e voltar depois pelo mesmo link. Quando terminar, toque em
              <strong> Enviar seleção</strong>.
            </p>
          </>
        )}
      </section>

      <div className="abar" id="fotos">
        <div className="abar-count">
          <strong>
            {count}
            {limit ? <span> / {limit}</span> : null}
          </strong>
          <span>{locked ? "fotos escolhidas" : "escolhidas"}</span>
          {limit > 0 && <i style={{ width: `${pct}%` }} className={count === limit ? "is-full" : ""} />}
        </div>
        <div className="abar-actions">
          <div className="aswitch" role="group" aria-label="Mostrar">
            <button type="button" className={!onlyChosen ? "is-on" : ""} onClick={() => setOnlyChosen(false)}>
              Todas ({photos.length})
            </button>
            <button type="button" className={onlyChosen ? "is-on" : ""} onClick={() => setOnlyChosen(true)}>
              Escolhidas ({count})
            </button>
          </div>
          {!locked && (
            <button type="button" className="gbtn" disabled={!count} onClick={() => setAsking(true)}>
              Enviar seleção
            </button>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <nav className="gtabs" aria-label="Categorias">
          <button type="button" className={!tab ? "is-on" : ""} onClick={() => setTab("")}>
            Todas
          </button>
          {tabs.map((t) => (
            <button key={t.id} type="button" className={t.id === tab ? "is-on" : ""} onClick={() => setTab(t.id)}>
              {t.name}
            </button>
          ))}
        </nav>
      )}

      <div className="agrid">
        {shown.map((p, i) => (
          <div key={p.id} className={`atile${p.s ? " is-chosen" : ""}`}>
            <button
              type="button"
              className="atile-photo ph"
              style={{ backgroundImage: `url(${src(p.id, "mini")})` }}
              onClick={() => setOpen(i)}
              aria-label={`Ver foto ${i + 1}`}
            />
            {!locked || p.s ? (
              <button type="button" className="aheart" aria-pressed={p.s} aria-label={p.s ? "Desmarcar" : "Escolher"} onClick={() => toggle(p)} disabled={locked}>
                <Heart on={p.s} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {!shown.length && <p className="gempty">{onlyChosen ? "Nenhuma foto escolhida ainda." : "As fotos estão sendo preparadas."}</p>}

      <footer className="gfoot">
        <span>Fotos de prova com marca d&apos;água. As escolhidas serão entregues em alta qualidade, sem marca.</span>
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
            <button type="button" className="gicon" onClick={() => setOpen(null)} aria-label="Fechar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
            </button>
          </div>
          <div className="gbox-stage" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            <div key={current.id} className="abox-photo ph" style={{ backgroundImage: `url(${src(current.id, "tela")})`, aspectRatio: `${current.w ?? 3} / ${current.h ?? 2}` }} />
            <button type="button" className="gbox-nav prev" onClick={() => step(-1)} aria-label="Anterior">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" /></svg>
            </button>
            <button type="button" className="gbox-nav next" onClick={() => step(1)} aria-label="Próxima">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg>
            </button>
          </div>
          <div className="gbox-bottom">
            {!locked && (
              <button type="button" className={`gbtn${current.s ? "" : " gbtn-ghost"}`} onClick={() => toggle(current)}>
                <Heart on={current.s} /> {current.s ? "Escolhida" : "Escolher esta"}
              </button>
            )}
            <span className="gbox-count">
              {count}
              {limit ? ` / ${limit}` : ""} escolhidas
            </span>
          </div>
        </div>
      )}

      {asking && (
        <div className="amodal" role="dialog" aria-modal="true" aria-labelledby="amodal-t">
          <div className="amodal-card">
            <h3 id="amodal-t">Enviar seleção</h3>
            <p>
              Você escolheu <strong>{count}</strong> {limit ? `de ${limit}` : ""} fotos.
              {limit && count < limit ? ` Ainda cabem ${limit - count}; pode enviar assim mesmo.` : ""} Depois de enviar, a escolha fica travada.
            </p>
            <label className="field">
              <span>Seu nome</span>
              <input id="a-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="field">
              <span>Recado para os fotógrafos (opcional)</span>
              <textarea id="a-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="actions">
              <button type="button" className="gbtn" disabled={busy || !name.trim()} onClick={submit}>
                {busy ? "Enviando…" : "Confirmar envio"}
              </button>
              <button type="button" className="gbtn gbtn-ghost" onClick={() => setAsking(false)}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {msg && <div className="gtoast" role="status">{msg}</div>}
      <div className="ashield" aria-hidden="true">
        <span>{brand}</span>
      </div>
    </div>
  );
}

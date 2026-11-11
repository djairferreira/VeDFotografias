"use client";

import { useActionState, useState, useTransition } from "react";
import { saveLink, suggestSlug, type ActionState } from "@/app/actions/admin";

export function LinkSettings({
  gallery,
  origin,
  photoCount,
}: {
  gallery: { id: string; title: string; slug: string | null; kind: "gallery" | "album"; link_enabled: boolean; select_limit: number | null };
  origin: string;
  photoCount: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveLink, {});
  const [kind, setKind] = useState(gallery.kind);
  const [slug, setSlug] = useState(gallery.slug ?? "");
  const [enabled, setEnabled] = useState(gallery.link_enabled);
  const [copied, setCopied] = useState(false);
  const [suggesting, startSuggest] = useTransition();
  const clean = slug.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-");
  const url = `${origin}/${kind === "album" ? "album" : "galeria"}/${clean}`;
  const saved = gallery.slug === clean && gallery.kind === kind;
  const msg =
    kind === "album"
      ? `Olá! Suas fotos estão prontas para a escolha do álbum. Escolha suas favoritas aqui: ${url}`
      : `Olá! Suas fotos estão prontas. Veja e baixe aqui: ${url}`;

  return (
    <form action={action} className="block" style={{ gap: 32 }}>
      <input type="hidden" name="id" value={gallery.id} />

      <section className="block">
        <div className="block-head"><h2>Tipo</h2></div>
        <div className="kind-cards">
          <label className={`kind-card${kind === "gallery" ? " is-on" : ""}`}>
            <input type="radio" name="kind" value="gallery" checked={kind === "gallery"} onChange={() => setKind("gallery")} />
            <strong>Galeria para entregar</strong>
            <span>Quem tem o link vê as fotos por categoria e baixa em qualidade máxima. Ideal para mandar aos noivos e convidados.</span>
          </label>
          <label className={`kind-card${kind === "album" ? " is-on" : ""}`}>
            <input type="radio" name="kind" value="album" checked={kind === "album"} onChange={() => setKind("album")} />
            <strong>Álbum para seleção</strong>
            <span>O cliente vê as fotos com marca d&apos;água, escolhe as do álbum e envia a lista para vocês. Sem download.</span>
          </label>
        </div>
        {kind === "album" && (
          <label className="field" style={{ maxWidth: 360 }}>
            <span>Quantas fotos o cliente pode escolher</span>
            <input id="l-limit" name="select_limit" type="number" min={1} max={5000} defaultValue={gallery.select_limit ?? 60} required />
            <small>Ex.: 60 fotos contratadas, entre as {photoCount} desta galeria.</small>
          </label>
        )}
      </section>

      <section className="block">
        <div className="block-head"><h2>Endereço do link</h2></div>
        <div className="slug-row">
          <span className="slug-prefix">{origin.replace(/^https?:\/\//, "")}/{kind === "album" ? "album" : "galeria"}/</span>
          <input id="l-slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="lays-e-thiago" required aria-label="Endereço" />
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            disabled={suggesting}
            onClick={() => startSuggest(async () => setSlug(await suggestSlug(gallery.title, gallery.id)))}
          >
            {suggesting ? "Gerando…" : "Gerar pelo título"}
          </button>
        </div>
        <small className="field"><small>Use só letras sem acento, números e hífens. Ex.: lays-e-thiago, ensaio-gestante-ana.</small></small>
      </section>

      <section className="block">
        <div className="block-head"><h2>Quem pode abrir</h2></div>
        <label className="switch">
          <input id="l-enabled" type="checkbox" name="link_enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <i aria-hidden="true" />
          <span>
            <strong>{enabled ? "Link aberto" : "Link fechado"}</strong>
            {enabled ? "Qualquer pessoa com o link vê as fotos, sem precisar de conta." : "Só o cliente cadastrado (entrando na área do cliente) e vocês conseguem abrir."}
          </span>
        </label>
      </section>

      {state.error && <p className="form-error">{state.error}</p>}
      {state.ok && <p className="form-ok">{state.ok}</p>}
      <div className="actions">
        <button className="btn btn-solid" disabled={pending}>{pending ? "Salvando…" : "Salvar link"}</button>
      </div>

      <section className="share-box">
        <p className="eyebrow">{saved ? "Link para compartilhar" : "Salve para usar este link"}</p>
        <p className="share-url">{url}</p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-solid btn-sm"
            disabled={!saved}
            onClick={() => navigator.clipboard?.writeText(url).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000))).catch(() => {})}
          >
            {copied ? "Copiado" : "Copiar link"}
          </button>
          <a className={`btn btn-quiet btn-sm${saved ? "" : " is-disabled"}`} href={saved ? `https://wa.me/?text=${encodeURIComponent(msg)}` : undefined} target="_blank" rel="noopener noreferrer">
            Enviar pelo WhatsApp
          </a>
          <a className={`btn btn-quiet btn-sm${saved ? "" : " is-disabled"}`} href={saved ? url : undefined} target="_blank" rel="noopener noreferrer">
            Abrir
          </a>
        </div>
      </section>
    </form>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { Cover } from "@/components/gallery/Cover";
import { COLORS, FONTS, POSITIONS, SIZES, type Design, type FontKey } from "@/lib/gallery-design";
import { saveDesign, setCover } from "@/app/actions/admin";

const POS_LABEL: Record<string, string> = {
  tl: "Em cima, à esquerda", tc: "Em cima, no centro", tr: "Em cima, à direita",
  ml: "No meio, à esquerda", mc: "Bem no centro", mr: "No meio, à direita",
  bl: "Embaixo, à esquerda", bc: "Embaixo, no centro", br: "Embaixo, à direita",
};

export function CoverDesigner({
  galleryId,
  initialTitle,
  initial,
  dateText,
  brand,
  coverId: initialCover,
  photos,
}: {
  galleryId: string;
  initialTitle: string;
  initial: Design;
  dateText: string;
  brand: string;
  coverId: string | null;
  photos: { id: string }[];
}) {
  const [d, setD] = useState<Design>(initial);
  const [title, setTitle] = useState(initialTitle);
  const [cover, setCoverId] = useState(initialCover);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const set = (p: Partial<Design>) => {
    setD((x) => ({ ...x, ...p }));
    setMsg({});
  };
  const img = cover ? `/api/media/${cover}/tela` : null;
  const subtitle = d.subtitle || dateText;
  const thumbs = showAll ? photos : photos.slice(0, 24);

  function save() {
    start(async () => {
      const r = await saveDesign(galleryId, title, d);
      if (r.ok && cover !== initialCover && cover) await setCover(galleryId, cover);
      setMsg(r);
    });
  }

  return (
    <div className="designer">
      <div className="designer-previews">
        <div className="designer-desktop">
          <span className="designer-tag">Computador · clique na foto para escolher o ponto central</span>
          <Cover image={img} design={d} title={title || "Título"} subtitle={subtitle} brand={brand} preview onPick={(x, y) => set({ focusX: x, focusY: y })} />
        </div>
        <div className="designer-phone">
          <span className="designer-tag">Celular</span>
          <div className="designer-phone-frame">
            <Cover image={img} design={d} title={title || "Título"} subtitle={subtitle} brand={brand} preview onPick={(x, y) => set({ focusX: x, focusY: y })} />
          </div>
        </div>
      </div>

      <div className="designer-controls">
        <section className="dc">
          <h3>1. Foto do fundo</h3>
          {photos.length ? (
            <>
              <div className="dc-photos">
                {thumbs.map((p) => (
                  <button key={p.id} type="button" className={p.id === cover ? "is-on" : ""} onClick={() => setCoverId(p.id)} aria-label="Usar como capa">
                    <img src={`/api/media/${p.id}/mini`} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
              {photos.length > 24 && (
                <button type="button" className="linklike" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Ver todas as ${photos.length} fotos`}
                </button>
              )}
            </>
          ) : (
            <p className="dc-hint">Envie fotos na aba Fotos para escolher a capa.</p>
          )}
        </section>

        <section className="dc">
          <h3>2. Textos</h3>
          <label className="field">
            <span>Título</span>
            <input id="d-title" value={title} onChange={(e) => (setTitle(e.target.value), setMsg({}))} placeholder="Ex.: Lays & Thiago" />
          </label>
          <label className="field">
            <span>Linha de baixo</span>
            <input id="d-sub" value={d.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder={dateText || "Ex.: 4 de outubro de 2026"} />
            <small>Vazio: mostra a data do evento.</small>
          </label>
          <label className="field">
            <span>Texto do botão</span>
            <input id="d-btn" value={d.button} onChange={(e) => set({ button: e.target.value })} />
          </label>
          <label className="check">
            <input id="d-brand" type="checkbox" checked={d.showBrand} onChange={(e) => set({ showBrand: e.target.checked })} />
            Mostrar &quot;{brand}&quot; no alto
          </label>
        </section>

        <section className="dc">
          <h3>3. Onde fica o título</h3>
          <div className="dc-pos" role="radiogroup" aria-label="Posição do título">
            {POSITIONS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={d.pos === p} title={POS_LABEL[p]} className={d.pos === p ? "is-on" : ""} onClick={() => set({ pos: p })}>
                <i />
              </button>
            ))}
          </div>
          <p className="dc-hint">{POS_LABEL[d.pos]}</p>
        </section>

        <section className="dc">
          <h3>4. Letra</h3>
          <div className="dc-fonts">
            {(Object.keys(FONTS) as FontKey[]).map((k) => {
              const f = FONTS[k];
              return (
                <button key={k} type="button" className={d.font === k ? "is-on" : ""} onClick={() => set({ font: k })}>
                  <b style={{ fontFamily: f.family, fontWeight: f.weight, fontStyle: f.italic ? "italic" : "normal", textTransform: f.upper ? "uppercase" : "none" }}>
                    {f.upper ? "Aa" : "Amor"}
                  </b>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dc">
          <h3>5. Cor e tamanho</h3>
          <div className="dc-colors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={d.color.toLowerCase() === c ? "is-on" : ""} style={{ background: c }} onClick={() => set({ color: c })} aria-label={`Cor ${c}`} />
            ))}
            <label className="dc-custom" title="Outra cor">
              <input id="d-color" type="color" value={d.color} onChange={(e) => set({ color: e.target.value })} />
              Outra
            </label>
          </div>
          <div className="dc-sizes" role="radiogroup" aria-label="Tamanho do título">
            {SIZES.map((s, i) => (
              <button key={s.label} type="button" role="radio" aria-checked={d.size === i} className={d.size === i ? "is-on" : ""} onClick={() => set({ size: i })}>
                {s.label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Escurecer a foto: {d.shade}%</span>
            <input id="d-shade" type="range" min={0} max={70} value={d.shade} onChange={(e) => set({ shade: Number(e.target.value) })} />
            <small>Ajuda o título a aparecer em fotos claras.</small>
          </label>
        </section>

        <div className="dc-save">
          <button type="button" className="btn btn-solid" onClick={save} disabled={pending}>
            {pending ? "Salvando…" : "Salvar capa"}
          </button>
          {msg.ok && <p className="form-ok">{msg.ok}</p>}
          {msg.error && <p className="form-error">{msg.error}</p>}
        </div>
      </div>
    </div>
  );
}

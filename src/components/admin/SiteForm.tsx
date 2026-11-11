"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState } from "react";
import { saveSite, type ActionState } from "@/app/actions/admin";
import type { SiteContent, Testimonial } from "@/lib/site-content";

type Field = { k: keyof SiteContent; label: string; long?: boolean };
type Group = { title: string; fields: Field[]; images?: string[] };

const GROUPS: Group[] = [
  {
    title: "Marca e topo",
    fields: [
      { k: "brand", label: "Nome da empresa (aba do navegador e rodapé)" },
      { k: "announcement", label: "Faixa do topo" },
      { k: "heroEyebrow", label: "Frase da capa" },
      { k: "heroButton", label: "Botão da capa" },
    ],
    images: ["hero"],
  },
  {
    title: "Apresentação",
    fields: [
      { k: "introTitle", label: "Título" },
      { k: "introText", label: "Texto", long: true },
    ],
  },
  {
    title: "Sobre",
    fields: [
      { k: "aboutSide", label: "Texto vertical" },
      { k: "aboutTitleItalic", label: "Título (parte em itálico)" },
      { k: "aboutTitle", label: "Título (resto)" },
      { k: "aboutScript", label: "Frase manuscrita sobre a foto" },
      { k: "aboutText", label: "Texto", long: true },
    ],
    images: ["aboutLarge", "aboutSmall"],
  },
  {
    title: "Serviços",
    fields: [
      { k: "servicesItalic", label: "Título (início)" },
      { k: "servicesTitle", label: "Título (itálico)" },
      { k: "service1", label: "Serviço 1" },
      { k: "service2", label: "Serviço 2" },
      { k: "service3", label: "Serviço 3" },
      { k: "servicesButton", label: "Botão" },
    ],
    images: ["service1", "service2", "service3"],
  },
  {
    title: "Missão",
    fields: [
      { k: "missionEyebrow", label: "Linha de cima" },
      { k: "missionTitle", label: "Título" },
    ],
    images: ["mission", "testimonial"],
  },
  {
    title: "Olá",
    fields: [
      { k: "helloSide", label: "Texto vertical" },
      { k: "helloItalic", label: "Título (itálico)" },
      { k: "helloTitle", label: "Título (resto)" },
      { k: "helloButton", label: "Botão" },
      { k: "helloText", label: "Texto", long: true },
    ],
    images: ["hello"],
  },
  {
    title: "Contato e rodapé",
    fields: [
      { k: "contactTitle", label: "Título do contato" },
      { k: "contactText", label: "Texto do contato" },
      { k: "email", label: "E-mail" },
      { k: "phone", label: "Telefone" },
      { k: "instagram", label: "Instagram" },
      { k: "city", label: "Cidade" },
    ],
    images: ["login"],
  },
];

export function SiteForm({
  content,
  slots,
}: {
  content: SiteContent;
  slots: { key: string; label: string; url: string; custom: boolean }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSite, {});
  const bySlot = Object.fromEntries(slots.map((s) => [s.key, s]));
  const testimonials: Testimonial[] = [...content.testimonials];
  while (testimonials.length < 4) testimonials.push({ title: "", quote: "", author: "" });

  const status = (
    <>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.ok && <p className="form-ok">{state.ok}</p>}
    </>
  );

  return (
    <form action={action} className="block" style={{ gap: 44 }}>
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="block" style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="block-head"><h2>{g.title}</h2></div>
          <div className="form">
            {g.fields.map((f) => (
              <label key={f.k} className={`field${f.long ? " field-wide" : ""}`}>
                <span>{f.label}</span>
                {f.long ? (
                  <textarea id={`s-${f.k}`} name={f.k} rows={4} defaultValue={String(content[f.k])} />
                ) : (
                  <input id={`s-${f.k}`} name={f.k} defaultValue={String(content[f.k])} />
                )}
              </label>
            ))}
          </div>
          {g.images && (
            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {g.images.map((slot) => {
                const s = bySlot[slot];
                return (
                  <div key={slot} className="card">
                    <div className="card-img" style={{ aspectRatio: "4 / 3" }}>
                      <img src={s.url} alt="" loading="lazy" />
                    </div>
                    <span className="card-meta">{s.label}</span>
                    <input id={`img-${slot}`} type="file" name={`img_${slot}`} accept="image/jpeg,image/png,image/webp" style={{ fontSize: 12.5 }} />
                    {s.custom && (
                      <label className="check" style={{ fontSize: 12.5 }}>
                        <input id={`reset-${slot}`} type="checkbox" name={`reset_${slot}`} /> Voltar à foto original
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}

      <fieldset className="block" style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="block-head"><h2>Depoimentos</h2></div>
        <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
          Use *asteriscos* para deixar uma palavra do título em itálico. Deixe vazio para remover.
        </p>
        {testimonials.map((t, i) => (
          <div key={i} className="form" style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            <label className="field">
              <span>Título {i + 1}</span>
              <input id={`t${i}-title`} name={`t${i}_title`} defaultValue={t.title} />
            </label>
            <label className="field">
              <span>Autor</span>
              <input id={`t${i}-author`} name={`t${i}_author`} defaultValue={t.author} />
            </label>
            <label className="field field-wide">
              <span>Depoimento</span>
              <textarea id={`t${i}-quote`} name={`t${i}_quote`} rows={3} defaultValue={t.quote} />
            </label>
          </div>
        ))}
      </fieldset>

      <div className="toolbar" style={{ bottom: 0, top: "auto" }}>
        <span className="toolbar-info">Fotos do site: até 4 MB cada</span>
        <div className="actions">
          {status}
          <button className="btn btn-solid" disabled={pending}>{pending ? "Salvando…" : "Salvar site"}</button>
        </div>
      </div>
    </form>
  );
}

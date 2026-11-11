/** Visual da capa de uma galeria/álbum. Usado no painel (prévia ao vivo) e na página pública. */

export const FONTS = {
  lato: { label: "Moderna", family: "var(--font-lato), Lato, Helvetica, sans-serif", weight: 700, upper: true, italic: false, tracking: "0.03em" },
  montserrat: { label: "Geométrica", family: "var(--font-label), Montserrat, sans-serif", weight: 500, upper: true, italic: false, tracking: "0.12em" },
  cormorant: { label: "Clássica", family: "var(--font-display), 'Cormorant Garamond', Georgia, serif", weight: 400, upper: true, italic: false, tracking: "0.02em" },
  lora: { label: "Romântica", family: "var(--font-body), Lora, Georgia, serif", weight: 400, upper: false, italic: true, tracking: "0" },
  script: { label: "Manuscrita", family: "var(--font-script), 'Brush Script MT', cursive", weight: 400, upper: false, italic: false, tracking: "0" },
} as const;
export type FontKey = keyof typeof FONTS;

/** Posição do título: linha (t, m, b) + coluna (l, c, r). */
export const POSITIONS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"] as const;
export type Position = (typeof POSITIONS)[number];

const size = (label: string, min: number, vw: number, max: number) => ({
  label,
  css: `clamp(${min}px, ${vw}vw, ${max}px)`,
  // Prévia: mesma conta, mas relativa à largura da moldura (--dev = largura do aparelho / 100).
  preview: `clamp(calc(${min}cqw / var(--dev, 14.4)), ${vw}cqw, calc(${max}cqw / var(--dev, 14.4)))`,
});
export const SIZES = [size("P", 26, 4, 40), size("M", 32, 5.5, 58), size("G", 38, 7, 78), size("GG", 44, 9, 104), size("XG", 50, 11, 132)];

export const COLORS = ["#ffffff", "#f3ede6", "#e8dfd4", "#3a3431", "#000000", "#8b6b59"];

export type Design = {
  focusX: number; // 0–100: ponto da foto que fica no centro
  focusY: number;
  pos: Position;
  font: FontKey;
  color: string;
  size: number; // 0–4
  shade: number; // 0–70: escurecer a foto para o título aparecer
  subtitle: string; // vazio = data do evento
  button: string;
  showBrand: boolean;
};

export const DEFAULT_DESIGN: Design = {
  focusX: 50,
  focusY: 50,
  pos: "bl",
  font: "lato",
  color: "#ffffff",
  size: 2,
  shade: 25,
  subtitle: "",
  button: "Ver galeria",
  showBrand: true,
};

const clamp = (n: unknown, lo: number, hi: number, d: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;
};

/** Aceita qualquer JSON vindo do banco ou do formulário e devolve um visual válido. */
export function readDesign(raw: unknown): Design {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    focusX: clamp(r.focusX, 0, 100, DEFAULT_DESIGN.focusX),
    focusY: clamp(r.focusY, 0, 100, DEFAULT_DESIGN.focusY),
    pos: POSITIONS.includes(r.pos as Position) ? (r.pos as Position) : DEFAULT_DESIGN.pos,
    font: (r.font as string) in FONTS ? (r.font as FontKey) : DEFAULT_DESIGN.font,
    color: typeof r.color === "string" && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color : DEFAULT_DESIGN.color,
    size: clamp(r.size, 0, SIZES.length - 1, DEFAULT_DESIGN.size),
    shade: clamp(r.shade, 0, 70, DEFAULT_DESIGN.shade),
    subtitle: typeof r.subtitle === "string" ? r.subtitle.slice(0, 80) : "",
    button: typeof r.button === "string" && r.button.trim() ? r.button.slice(0, 30) : DEFAULT_DESIGN.button,
    showBrand: r.showBrand !== false,
  };
}

/** Estilos da capa a partir do visual. */
export function coverStyles(d: Design, preview = false) {
  const f = FONTS[d.font];
  const [row, col] = [d.pos[0], d.pos[1]];
  return {
    image: { objectPosition: `${d.focusX}% ${d.focusY}%` },
    shade: { background: `linear-gradient(${row === "t" ? "180deg" : row === "b" ? "0deg" : "0deg"}, rgba(0,0,0,${(d.shade / 100) * 1.3}) 0%, rgba(0,0,0,${d.shade / 100}) 45%, rgba(0,0,0,${(d.shade / 100) * 0.4}) 100%)` },
    box: {
      justifyContent: row === "t" ? "flex-start" : row === "m" ? "center" : "flex-end",
      alignItems: col === "l" ? "flex-start" : col === "c" ? "center" : "flex-end",
      textAlign: (col === "l" ? "left" : col === "c" ? "center" : "right") as "left" | "center" | "right",
      color: d.color,
    },
    title: {
      fontFamily: f.family,
      fontWeight: f.weight,
      fontStyle: f.italic ? "italic" : "normal",
      textTransform: (f.upper ? "uppercase" : "none") as "uppercase" | "none",
      letterSpacing: f.tracking,
      fontSize: preview ? SIZES[d.size].preview : SIZES[d.size].css,
    },
  };
}

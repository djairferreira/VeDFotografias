/* eslint-disable @next/next/no-img-element */
import { coverStyles, type Design } from "@/lib/gallery-design";

/** Capa da galeria/álbum. A mesma peça aparece na página pública e na prévia do painel. */
export function Cover({
  image,
  design,
  title,
  subtitle,
  brand,
  buttonHref,
  preview = false,
  onPick,
}: {
  image: string | null;
  design: Design;
  title: string;
  subtitle: string;
  brand: string;
  buttonHref?: string;
  preview?: boolean;
  onPick?: (x: number, y: number) => void;
}) {
  const s = coverStyles(design, preview);
  return (
    <section
      className={`gcover${preview ? " gcover-preview" : ""}${onPick ? " is-picking" : ""}`}
      onClick={
        onPick
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onPick(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
            }
          : undefined
      }
    >
      {image ? <img src={image} alt="" className="gcover-img" style={s.image} fetchPriority="high" /> : <div className="gcover-img gcover-empty" />}
      <div className="gcover-shade" style={s.shade} />
      {design.showBrand && <p className="gcover-brand">{brand}</p>}
      <div className="gcover-box" style={s.box}>
        <h1 className="gcover-title" style={s.title}>
          {title}
        </h1>
        {subtitle && <p className="gcover-sub">{subtitle}</p>}
        {buttonHref ? (
          <a href={buttonHref} className="gcover-btn" style={{ color: design.color, borderColor: design.color }}>
            {design.button}
          </a>
        ) : (
          <span className="gcover-btn" style={{ color: design.color, borderColor: design.color }}>
            {design.button}
          </span>
        )}
      </div>
      {onPick && (
        <span className="gcover-focus" style={{ left: `${design.focusX}%`, top: `${design.focusY}%` }} aria-hidden="true" />
      )}
    </section>
  );
}

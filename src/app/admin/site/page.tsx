import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent, IMAGE_SLOTS, imageUrl, type ImageSlot } from "@/lib/site-content";
import { SiteForm } from "@/components/admin/SiteForm";

export const metadata: Metadata = { title: "Site" };

export default async function SiteEditor() {
  const content = await getSiteContent();
  const slots = (Object.keys(IMAGE_SLOTS) as ImageSlot[]).map((key) => ({
    key,
    label: IMAGE_SLOTS[key].label,
    url: imageUrl(content, key),
    custom: !!content.images[key],
  }));
  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Página inicial</p>
          <h1 className="display"><em>Textos</em> e fotos</h1>
          <p>Tudo o que aparece no site público. Salve para publicar na hora.</p>
        </div>
        <Link href="/" target="_blank" className="btn btn-quiet">Abrir o site</Link>
      </header>
      <SiteForm content={content} slots={slots} />
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/tiff";
const MAX = 80 * 1024 * 1024;

function safe(name: string) {
  return (
    name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) ||
    "foto.jpg"
  );
}

export function Uploader({ galleryId, blob, categoryId = null }: { galleryId: string; blob: boolean; categoryId?: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const busy = total > 0 && done < total;

  async function sendOne(file: File) {
    if (file.size > MAX) throw new Error(`${file.name}: acima de 80 MB`);
    let res: Response;
    if (blob) {
      const key = `galerias/${galleryId}/originais/${crypto.randomUUID()}-${safe(file.name)}`;
      await upload(key, file, {
        access: "private",
        handleUploadUrl: "/api/admin/upload",
        clientPayload: galleryId,
        multipart: file.size > 8 * 1024 * 1024,
        contentType: file.type || "image/jpeg",
      });
      res = await fetch(`/api/admin/galleries/${galleryId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, filename: file.name, contentType: file.type || "image/jpeg", categoryId }),
      });
    } else {
      const fd = new FormData();
      fd.append("file", file);
      if (categoryId) fd.append("categoryId", categoryId);
      res = await fetch(`/api/admin/galleries/${galleryId}/photos`, { method: "POST", body: fd });
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`${file.name}: ${body.error ?? "falha no envio"}`);
    }
  }

  async function start(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif|tif|tiff)$/i.test(f.name));
    if (!files.length || busy) return;
    setErrors([]);
    setTotal(files.length);
    setDone(0);
    const queue = [...files];
    const errs: string[] = [];
    // Três envios ao mesmo tempo.
    await Promise.all(
      Array.from({ length: Math.min(3, files.length) }, async () => {
        for (let f = queue.shift(); f; f = queue.shift()) {
          try {
            await sendOne(f);
          } catch (e) {
            errs.push((e as Error).message);
          }
          setDone((d) => d + 1);
        }
      }),
    );
    setErrors(errs);
    router.refresh();
  }

  return (
    <div className="block">
      <div
        className={`drop${over ? " over" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          start(e.dataTransfer.files);
        }}
      >
        <strong>Arraste as fotos aqui</strong>
        <p>ou clique para escolher · JPG, PNG, WEBP, HEIC ou TIFF até 80 MB cada · o original fica guardado para download</p>
        <input
          ref={input}
          id="upload-input"
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) start(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {total > 0 && (
        <div className="progress" aria-live="polite">
          <div className="bar"><i style={{ width: `${(done / total) * 100}%` }} /></div>
          <p>{busy ? `Enviando ${done} de ${total}… não feche esta página.` : `${total - errors.length} de ${total} fotos enviadas.`}</p>
          {errors.length > 0 && (
            <ul className="upload-errors">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

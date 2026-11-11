"use client";

import { useMemo, useState, useTransition } from "react";
import { addCategory, deleteCategory, moveCategory, renameCategory, setPhotosCategory } from "@/app/actions/admin";
import { Uploader } from "./Uploader";
import { PhotoGrid } from "@/components/PhotoGrid";

type Cat = { id: string; name: string };
type P = { id: string; filename: string; c: string | null; s: boolean };

export function PhotoManager({
  galleryId,
  blob,
  coverId,
  categories,
  photos,
  album,
}: {
  galleryId: string;
  blob: boolean;
  coverId: string | null;
  categories: Cat[];
  photos: P[];
  album: boolean;
}) {
  const [filter, setFilter] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [uploadCat, setUploadCat] = useState<string>("");
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const m: Record<string, number> = { _none: 0 };
    for (const p of photos) m[p.c ?? "_none"] = (m[p.c ?? "_none"] ?? 0) + 1;
    return m;
  }, [photos]);
  const shown = filter === "" ? photos : filter === "_none" ? photos.filter((p) => !p.c) : photos.filter((p) => p.c === filter);

  return (
    <div className="block" style={{ gap: 26 }}>
      <section className="block">
        <div className="block-head">
          <h2>Categorias</h2>
        </div>
        <p className="dc-hint" style={{ margin: 0 }}>
          Ex.: Making of, Cerimônia, Noivos, Festa. Elas viram as abas da galeria. Clique numa categoria para ver só as fotos dela.
        </p>
        <div className="cats">
          <button type="button" className={`cat${filter === "" ? " is-on" : ""}`} onClick={() => setFilter("")}>
            Todas <em>{photos.length}</em>
          </button>
          {categories.map((c, i) =>
            editing === c.id ? (
              <form
                key={c.id}
                className="cat cat-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => {
                    await renameCategory(c.id, editName);
                    setEditing(null);
                  });
                }}
              >
                <input id={`cat-${c.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Nome da categoria" />
                <button className="btn btn-solid btn-sm" disabled={pending}>Ok</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
              </form>
            ) : (
              <div key={c.id} className={`cat${filter === c.id ? " is-on" : ""}`}>
                <button type="button" className="cat-name" onClick={() => setFilter(c.id)}>
                  {c.name} <em>{counts[c.id] ?? 0}</em>
                </button>
                <span className="cat-tools">
                  <button type="button" title="Mover para a esquerda" disabled={i === 0 || pending} onClick={() => start(() => moveCategory(c.id, -1))}>‹</button>
                  <button type="button" title="Mover para a direita" disabled={i === categories.length - 1 || pending} onClick={() => start(() => moveCategory(c.id, 1))}>›</button>
                  <button type="button" title="Renomear" onClick={() => (setEditing(c.id), setEditName(c.name))}>✎</button>
                  {confirmDel === c.id ? (
                    <button
                      type="button"
                      className="cat-del"
                      onClick={() =>
                        start(async () => {
                          await deleteCategory(c.id);
                          setConfirmDel(null);
                          if (filter === c.id) setFilter("");
                        })
                      }
                    >
                      Apagar?
                    </button>
                  ) : (
                    <button type="button" title="Apagar categoria (as fotos ficam)" onClick={() => setConfirmDel(c.id)}>×</button>
                  )}
                </span>
              </div>
            ),
          )}
          {counts._none > 0 && categories.length > 0 && (
            <button type="button" className={`cat cat-muted${filter === "_none" ? " is-on" : ""}`} onClick={() => setFilter("_none")}>
              Sem categoria <em>{counts._none}</em>
            </button>
          )}
          {adding ? (
            <form
              className="cat cat-edit"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                start(async () => {
                  await addCategory(galleryId, newName);
                  setNewName("");
                  setAdding(false);
                });
              }}
            >
              <input id="new-cat" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome da categoria" autoFocus aria-label="Nova categoria" />
              <button className="btn btn-solid btn-sm" disabled={pending}>Criar</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAdding(false)}>Cancelar</button>
            </form>
          ) : (
            <button type="button" className="cat cat-add" onClick={() => setAdding(true)}>
              + Nova categoria
            </button>
          )}
        </div>
      </section>

      <section className="block">
        {categories.length > 0 && (
          <label className="field" style={{ maxWidth: 360 }}>
            <span>As próximas fotos enviadas vão para</span>
            <select id="upload-cat" value={uploadCat} onChange={(e) => setUploadCat(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <Uploader galleryId={galleryId} blob={blob} categoryId={uploadCat || null} />
      </section>

      <section className="block">
        <PhotoGrid
          photos={shown.map((p) => ({ id: p.id, filename: p.filename, selected: album && p.s }))}
          galleryId={galleryId}
          mode="admin"
          coverId={coverId}
          categories={categories}
          onMove={(ids, cat) => setPhotosCategory(galleryId, ids, cat)}
        />
      </section>
    </div>
  );
}

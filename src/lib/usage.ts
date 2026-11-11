import "server-only";
import { one, query } from "./db";
import { storageUsage } from "./storage";

/** Preços do Neon (plano por uso), em dólar. Atualize aqui se o Neon mudar a tabela. */
export const NEON_PRICES = {
  storagePerGbMonth: 0.35,
  restorePerGbMonth: 0.2,
  includedTransferGb: 500,
};

const GB = 1024 ** 3;

export type Usage = Awaited<ReturnType<typeof getUsage>>;

export async function getUsage(restoreDays: number) {
  const [db, tables, wal, photos, files] = await Promise.all([
    one<{ bytes: string }>("select pg_database_size(current_database()) bytes"),
    query<{ name: string; bytes: string; rows: string }>(
      `select relname name, pg_total_relation_size(relid) bytes, n_live_tup rows
         from pg_stat_user_tables order by pg_total_relation_size(relid) desc`,
    ),
    one<{ wal_bytes: string; hours: number }>(
      "select wal_bytes, greatest(extract(epoch from now() - stats_reset) / 3600, 1)::float hours from pg_stat_wal",
    ).catch(() => null),
    one<{ n: string; original: string }>("select count(*) n, coalesce(sum(size_bytes), 0) original from photos"),
    storageUsage().catch(() => null),
  ]);

  const dbBytes = Number(db?.bytes ?? 0);
  // Histórico para restauração: quanto o banco escreve por dia × dias guardados.
  const walPerDay = wal ? (Number(wal.wal_bytes) / wal.hours) * 24 : 0;
  const restoreBytes = walPerDay * restoreDays;

  const storageCost = (dbBytes / GB) * NEON_PRICES.storagePerGbMonth;
  const restoreCost = (restoreBytes / GB) * NEON_PRICES.restorePerGbMonth;

  // Projeção: cada foto nova ocupa no banco só uma linha (~1 KB); o arquivo vai para o Blob.
  const photoCount = Number(photos?.n ?? 0);
  const avgPhotoFiles = photoCount && files ? files.total / photoCount : 0;

  return {
    dbBytes,
    tables: tables.map((t) => ({ name: t.name, bytes: Number(t.bytes), rows: Number(t.rows) })),
    walPerDay,
    walHours: wal?.hours ?? 0,
    restoreDays,
    restoreBytes,
    storageCost,
    restoreCost,
    neonTotal: storageCost + restoreCost,
    photoCount,
    originalBytes: Number(photos?.original ?? 0),
    files,
    avgPhotoFiles,
  };
}

export function usd(v: number) {
  const digits = v === 0 ? 2 : v < 0.01 ? 4 : 2;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function gb(bytes: number) {
  const v = bytes / GB;
  if (v >= 1) return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(0, Math.round(bytes / 1024)).toLocaleString("pt-BR")} KB`;
}

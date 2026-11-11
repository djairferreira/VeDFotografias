import "server-only";
import { Pool, types, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Datas (tipo DATE) chegam como texto "AAAA-MM-DD", sem fuso.
types.setTypeParser(1082, (v) => v);

// Uma pool por instância (Fluid compute reaproveita a instância entre requisições).
const globalForDb = globalThis as unknown as { __pool?: Pool };

function getPool() {
  if (!globalForDb.__pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurado");
    globalForDb.__pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
    });
    // Fecha conexões ociosas antes da instância ser suspensa (Fluid compute).
    attachDatabasePool(globalForDb.__pool);
  }
  return globalForDb.__pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

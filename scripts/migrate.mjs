// Aplica db/schema.sql no banco de DATABASE_URL.
// Uso: npm run db:migrate
import { readFileSync } from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definido (crie .env.local).");
  process.exit(1);
}
const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
// Migração pela conexão direta (sem "-pooler"), como recomenda o Neon.
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL.replace("-pooler.", ".");
const client = new pg.Client({ connectionString: direct });
await client.connect();
try {
  await client.query(sql);
  console.log("Esquema aplicado.");
} finally {
  await client.end();
}

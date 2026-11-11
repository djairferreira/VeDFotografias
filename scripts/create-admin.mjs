// Cria (ou redefine a senha de) um administrador.
// Uso: npm run admin:create -- "Nome" email@dominio.com [senha]
// Sem senha, gera uma aleatória e mostra no terminal.
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const [name, email, given] = process.argv.slice(2);
if (!name || !email) {
  console.error('Uso: npm run admin:create -- "Nome" email@dominio.com [senha]');
  process.exit(1);
}
const password = given || randomBytes(9).toString("base64url");
const hash = await bcrypt.hash(password, 12);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query("select id from users where lower(email) = lower($1)", [email]);
  if (rows[0]) {
    await client.query(
      "update users set name = $2, password_hash = $3, role = 'admin', active = true where id = $1",
      [rows[0].id, name, hash],
    );
    console.log("Administrador atualizado.");
  } else {
    await client.query(
      "insert into users (name, email, password_hash, role) values ($1, lower($2), $3, 'admin')",
      [name, email, hash],
    );
    console.log("Administrador criado.");
  }
  console.log(`E-mail: ${email}\nSenha:  ${password}`);
} finally {
  await client.end();
}

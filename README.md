# VeD Fotografias · banco de fotos

Site de fotógrafo com área do cliente. O admin cadastra clientes, cria galerias e envia as fotos; cada cliente entra com e-mail e senha e baixa os originais (uma a uma, as selecionadas ou tudo em .zip).

## Partes

| Endereço | O que é |
| --- | --- |
| `/` | Site público (textos e fotos editáveis em Painel › Site) com formulário de orçamento |
| `/entrar` | Login de clientes e administradores |
| `/cliente` | Galerias do cliente logado, visualizador e downloads |
| `/admin` | Painel: clientes, galerias, envio de fotos, mensagens do site, textos do site |

## Arquitetura

- **Next.js 16** (App Router) na Vercel.
- **Postgres (Neon)**: tabelas em `db/schema.sql` (usuários, sessões, galerias, fotos, downloads, mensagens, conteúdo do site). Acesso direto com `pg`, sem ORM.
- **Vercel Blob privado**: originais, versão de tela (2000 px) e miniatura (720 px). O navegador do admin envia o original direto para o Blob (até 80 MB por foto); o servidor gera as versões menores com `sharp`. Nenhuma foto tem endereço público: tudo passa por `/api/media/...` e `/api/zip/...`, que conferem o login e o dono da galeria.
- **Login próprio**: senha com bcrypt, sessão em cookie `httpOnly` guardada como hash no banco, bloqueio após 6 erros em 15 minutos.
- Sem Blob configurado (desenvolvimento local), as fotos ficam em `./storage`.

## Rodar localmente

```bash
npm install
# .env.local com DATABASE_URL=postgres://...
npm run db:migrate
npm run admin:create -- "Seu nome" voce@email.com   # mostra a senha gerada
npm run dev
```

## Variáveis de ambiente

| Nome | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon) |
| `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID` | Vercel Blob privado (criado ao conectar o store ao projeto) |

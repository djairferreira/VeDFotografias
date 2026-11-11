import type { Metadata } from "next";
import Link from "next/link";
import { getUsage, gb, NEON_PRICES, usd } from "@/lib/usage";

export const metadata: Metadata = { title: "Armazenamento" };

const TABLE_NAMES: Record<string, string> = {
  users: "Usuários",
  sessions: "Sessões de login",
  login_attempts: "Tentativas de login",
  galleries: "Galerias",
  photos: "Fotos (dados)",
  downloads: "Downloads",
  inquiries: "Mensagens do site",
  site_content: "Textos do site",
};
const KIND_NAMES: Record<string, string> = {
  originais: "Originais (para download)",
  tela: "Versão de tela (2000 px)",
  mini: "Miniaturas",
  site: "Fotos do site",
};

export default async function StoragePage({ searchParams }: PageProps<"/admin/armazenamento">) {
  const janela = Number((await searchParams).janela);
  const days = [1, 7, 14, 30].includes(janela) ? janela : 1;
  const u = await getUsage(days);
  const year = u.neonTotal * 12;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Banco de dados e fotos</p>
          <h1 className="display"><em>Armazenamento</em></h1>
          <p>Valores aproximados por mês, calculados com o espaço ocupado agora.</p>
        </div>
      </header>

      <section className="stats" aria-label="Resumo">
        <div className="stat"><b>{usd(u.neonTotal)}</b><span>Neon por mês (estimativa)</span></div>
        <div className="stat"><b>{gb(u.dbBytes)}</b><span>Banco de dados</span></div>
        <div className="stat"><b>{u.files ? gb(u.files.total) : "—"}</b><span>Fotos guardadas</span></div>
        <div className="stat"><b>{u.photoCount}</b><span>Fotos em galerias</span></div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Cobrança do Neon</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Uso</th>
                <th className="num">Preço</th>
                <th className="num">Por mês</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Armazenamento do banco
                  <span className="sub">Tudo o que está nas tabelas, com índices</span>
                </td>
                <td className="num">{gb(u.dbBytes)}</td>
                <td className="num">{usd(NEON_PRICES.storagePerGbMonth)} / GB-mês</td>
                <td className="num">{usd(u.storageCost)}</td>
              </tr>
              <tr>
                <td>
                  Restauração instantânea ({days} {days === 1 ? "dia" : "dias"} de histórico)
                  <span className="sub">
                    Estimado pelo que o banco grava por dia: {gb(u.walPerDay)}/dia
                    {u.walHours < 24 ? ` (medido nas últimas ${Math.round(u.walHours)} h)` : ""}
                  </span>
                </td>
                <td className="num">{gb(u.restoreBytes)}</td>
                <td className="num">{usd(NEON_PRICES.restorePerGbMonth)} / GB-mês</td>
                <td className="num">{usd(u.restoreCost)}</td>
              </tr>
              <tr>
                <td>
                  Transferência de dados
                  <span className="sub">O site consulta o banco com respostas pequenas</span>
                </td>
                <td className="num">bem abaixo do limite</td>
                <td className="num">{NEON_PRICES.includedTransferGb} GB incluídos</td>
                <td className="num">{usd(0)}</td>
              </tr>
              <tr>
                <td><strong>Total estimado</strong></td>
                <td />
                <td />
                <td className="num"><strong>{usd(u.neonTotal)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="actions" aria-label="Dias de histórico">
          <span className="toolbar-info" style={{ alignSelf: "center" }}>Histórico de restauração:</span>
          {[1, 7, 14, 30].map((d) => (
            <Link key={d} href={`/admin/armazenamento?janela=${d}`} className={`btn btn-sm ${d === days ? "btn-solid" : "btn-quiet"}`}>
              {d} {d === 1 ? "dia" : "dias"}
            </Link>
          ))}
        </div>
        <p className="field"><small>
          Cerca de {usd(year)} por ano no ritmo de hoje. A conta do Neon também cobra o tempo de processamento (computação), que não entra nesta estimativa.
        </small></p>
      </section>

      <div className="two-col">
        <section className="block">
          <div className="block-head"><h2>Onde está o espaço do banco</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Tabela</th><th className="num">Linhas</th><th className="num">Tamanho</th></tr>
              </thead>
              <tbody>
                {u.tables.map((t) => (
                  <tr key={t.name}>
                    <td>{TABLE_NAMES[t.name] ?? t.name}</td>
                    <td className="num">{t.rows.toLocaleString("pt-BR")}</td>
                    <td className="num">{gb(t.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field"><small>
            O restante do banco são arquivos internos do próprio Postgres, que já vêm ocupados mesmo com o banco vazio.
          </small></p>
        </section>

        <section className="block">
          <div className="block-head"><h2>Fotos (Vercel Blob)</h2></div>
          {u.files ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {Object.entries(u.files.byKind)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <tr key={k}>
                        <td>{KIND_NAMES[k] ?? k}</td>
                        <td className="num">{gb(v)}</td>
                      </tr>
                    ))}
                  <tr>
                    <td><strong>Total · {u.files.files.toLocaleString("pt-BR")} arquivos</strong></td>
                    <td className="num"><strong>{gb(u.files.total)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><p>Não consegui ler o armazenamento de fotos agora.</p></div>
          )}
          <p className="field"><small>
            As fotos não ficam no Neon: são cobradas pela Vercel, no plano dela.
            {u.photoCount > 0 && ` Cada foto ocupa em média ${gb(u.avgPhotoFiles)} contando original, versão de tela e miniatura.`}
            {u.files?.partial && " A contagem parou em 50 mil arquivos; o total real é maior."}
          </small></p>
        </section>
      </div>
    </>
  );
}

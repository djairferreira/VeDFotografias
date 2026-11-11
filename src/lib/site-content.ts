import "server-only";
import { cache } from "react";
import { one, query } from "./db";

/** Fotos do site que o admin pode trocar. Padrões ficam em /public/site. */
export const IMAGE_SLOTS = {
  hero: { label: "Capa (topo)", fallback: "/site/hero.jpg" },
  aboutLarge: { label: "Sobre: foto grande", fallback: "/site/sobre-grande.jpg" },
  aboutSmall: { label: "Sobre: foto pequena", fallback: "/site/sobre-pequena.jpg" },
  service1: { label: "Serviço 1", fallback: "/site/casamentos.jpg" },
  service2: { label: "Serviço 2", fallback: "/site/gestantes.jpg" },
  service3: { label: "Serviço 3", fallback: "/site/familia.jpg" },
  mission: { label: "Faixa da missão", fallback: "/site/missao.jpg" },
  testimonial: { label: "Foto redonda do depoimento", fallback: "/site/depoimento.jpg" },
  hello: { label: "Olá: retrato", fallback: "/site/ola.jpg" },
  login: { label: "Fundo do login", fallback: "/site/login.jpg" },
} as const;
export type ImageSlot = keyof typeof IMAGE_SLOTS;

export type Testimonial = { title: string; quote: string; author: string };

export type SiteContent = {
  brand: string;
  announcement: string;
  heroEyebrow: string;
  heroButton: string;
  introTitle: string;
  introText: string;
  aboutSide: string;
  aboutTitleItalic: string;
  aboutTitle: string;
  aboutText: string;
  aboutScript: string;
  servicesItalic: string;
  servicesTitle: string;
  service1: string;
  service2: string;
  service3: string;
  servicesButton: string;
  missionEyebrow: string;
  missionTitle: string;
  testimonials: Testimonial[];
  helloSide: string;
  helloItalic: string;
  helloTitle: string;
  helloText: string;
  helloButton: string;
  contactTitle: string;
  contactText: string;
  email: string;
  phone: string;
  instagram: string;
  city: string;
  images: Partial<Record<ImageSlot, string>>; // chave no armazenamento
};

export const DEFAULT_CONTENT: SiteContent = {
  brand: "CAPTURE",
  announcement: "Agenda aberta para a temporada de verão",
  heroEyebrow: "Capturando a beleza da vida",
  heroButton: "Solicitar orçamento",
  introTitle: "Fotografia de casamento & lifestyle",
  introText: "Registrando os grandes dias da vida e a beleza tranquila dos momentos de todo dia.",
  aboutSide: "Conheça a equipe",
  aboutTitleItalic: "Um brinde",
  aboutTitle: "à vida",
  aboutText:
    "Fotografamos pessoas, não poses. Chegamos cedo, conversamos, observamos a luz e deixamos o dia acontecer. Depois, cada imagem é tratada uma a uma e entregue numa galeria só sua, pronta para baixar em alta resolução.",
  aboutScript: "Capturando a beleza das memórias da vida",
  servicesItalic: "Nossos",
  servicesTitle: "serviços",
  service1: "Casamentos",
  service2: "Gestantes",
  service3: "Família",
  servicesButton: "Ver pacotes",
  missionEyebrow: "Este é o lugar perfeito para a",
  missionTitle: "nossa missão",
  testimonials: [
    {
      title: "Foi simplesmente *divino* trabalhar com eles!",
      quote:
        "Ficamos à vontade do começo ao fim. As fotos chegaram na galeria em poucas semanas e baixamos tudo em alta, direto do celular.",
      author: "Marina & Rafael",
    },
    {
      title: "Cada foto conta *a nossa* história",
      quote:
        "O ensaio de gestante virou o álbum preferido da família. Delicadeza em cada detalhe e uma entrega muito organizada.",
      author: "Juliana Prado",
    },
    {
      title: "Memórias que vamos *guardar* para sempre",
      quote:
        "Recebemos o acesso à galeria, escolhemos as preferidas e baixamos o álbum inteiro de uma vez. Simples e lindo.",
      author: "Família Tavares",
    },
  ],
  helloSide: "Prazer, sou eu",
  helloItalic: "Oh,",
  helloTitle: "olá",
  helloText:
    "Sou fotógrafa há mais de dez anos e ainda me emociono a cada entrega. Acredito em luz natural, em gente de verdade e em fotos que envelhecem bem. Se você chegou até aqui, adoraria ouvir a sua história.",
  helloButton: "Vamos conversar",
  contactTitle: "Conte sobre o seu dia",
  contactText: "Responda o formulário e retornamos em até dois dias úteis com datas e valores.",
  email: "contato@capture.com.br",
  phone: "(11) 99999-0000",
  instagram: "@capture.foto",
  city: "São Paulo · Brasil",
  images: {},
};

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    const row = await one<{ value: Partial<SiteContent> }>("select value from site_content where key = 'site'");
    return { ...DEFAULT_CONTENT, ...(row?.value ?? {}) };
  } catch {
    return DEFAULT_CONTENT;
  }
});

export async function saveSiteContent(value: SiteContent) {
  await query(
    `insert into site_content (key, value, updated_at) values ('site', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(value)],
  );
}

export function imageUrl(content: SiteContent, slot: ImageSlot) {
  const key = content.images[slot];
  return key ? `/api/site-image/${slot}?v=${encodeURIComponent(key.slice(-12))}` : IMAGE_SLOTS[slot].fallback;
}

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getSiteContent, imageUrl } from "@/lib/site-content";
import { getUser } from "@/lib/auth";
import { Testimonials } from "@/components/site/Testimonials";
import { InquiryForm } from "@/components/site/InquiryForm";
import "./site.css";

const Arrow = () => (
  <svg viewBox="0 0 34 10" aria-hidden="true">
    <path d="M1 5h31M28 1l4 4-4 4" />
  </svg>
);

export default async function Home() {
  const [c, user] = await Promise.all([getSiteContent(), getUser()]);
  const img = (s: Parameters<typeof imageUrl>[1]) => imageUrl(c, s);
  const clientHref = user ? (user.role === "admin" ? "/admin" : "/cliente") : "/entrar";

  return (
    <div className="site">
      <div className="topbar">
        <span>{c.announcement}</span>
        <Link href={clientHref} className="topbar-link">
          {user ? "Minha galeria" : "Área do cliente"}
        </Link>
      </div>

      <header className="masthead">
        <nav className="masthead-nav" aria-label="Principal">
          <a href="#sobre">Sobre</a>
          <a href="#servicos">Pacotes</a>
          <span className="masthead-gap" aria-hidden="true" />
          <a href="#portfolio">Portfólio</a>
          <a href="#contato">Contato</a>
        </nav>
        <Link href="/" className="seal" aria-label={c.brand}>
          <span>{c.brand}</span>
        </Link>
      </header>

      <section className="hero">
        <img src={img("hero")} alt="" fetchPriority="high" className="hero-img" />
        <div className="hero-copy">
          <p className="eyebrow">{c.heroEyebrow}</p>
          <a href="#contato" className="btn btn-ghost">
            {c.heroButton}
          </a>
        </div>
      </section>

      <section className="intro">
        <h1 className="eyebrow eyebrow-strong">{c.introTitle}</h1>
        <span className="rule" aria-hidden="true" />
        <p>{c.introText}</p>
      </section>

      <section className="about" id="sobre">
        <div className="about-copy">
          <div className="about-text">
            <h2 className="display">
              <em>{c.aboutTitleItalic}</em> {c.aboutTitle}
            </h2>
            <p>{c.aboutText}</p>
          </div>
          <p className="side-label" aria-hidden="true">{c.aboutSide}</p>
        </div>
        <div className="about-photos">
          <img src={img("aboutSmall")} alt="" className="about-small" loading="lazy" />
          <figure className="about-large">
            <img src={img("aboutLarge")} alt="" loading="lazy" />
            <figcaption className="script">{c.aboutScript}</figcaption>
          </figure>
        </div>
      </section>

      <section className="services" id="servicos">
        <figure className="service service-tall">
          <img src={img("service1")} alt="" loading="lazy" />
          <figcaption>{c.service1}</figcaption>
        </figure>
        <div className="services-side">
          <h2 className="display services-title">
            <span>
              {c.servicesItalic} <em>{c.servicesTitle}</em>
            </span>
          </h2>
          <div className="services-pair">
            <figure className="service service-a">
              <img src={img("service2")} alt="" loading="lazy" />
              <figcaption>{c.service2}</figcaption>
            </figure>
            <figure className="service service-b">
              <img src={img("service3")} alt="" loading="lazy" />
              <figcaption>{c.service3}</figcaption>
            </figure>
          </div>
          <a href="#contato" className="btn btn-solid services-btn">
            {c.servicesButton} <Arrow />
          </a>
        </div>
      </section>

      <section className="mission" id="missao">
        <img src={img("mission")} alt="" loading="lazy" className="mission-img" />
        <div className="mission-copy">
          <p className="eyebrow eyebrow-strong">{c.missionEyebrow}</p>
          <h2 className="display">{c.missionTitle}</h2>
        </div>
      </section>

      <section className="testimonials" id="depoimentos">
        <img src={img("testimonial")} alt="" loading="lazy" className="testimonial-circle" />
        <Testimonials items={c.testimonials} />
      </section>

      <section className="hello">
        <img src={img("hello")} alt="" loading="lazy" className="hello-img" />
        <div className="hello-copy">
          <p className="side-label" aria-hidden="true">{c.helloSide}</p>
          <div className="hello-text">
            <h2 className="display">
              <em>{c.helloItalic}</em> {c.helloTitle}
            </h2>
            <p>{c.helloText}</p>
            <a href="#contato" className="btn btn-ghost btn-dark">
              {c.helloButton}
            </a>
          </div>
        </div>
      </section>

      <section className="portfolio" id="portfolio" aria-label="Portfólio">
        {(["service1", "aboutLarge", "hero", "service3", "aboutSmall", "service2"] as const).map((s) => (
          <img key={s} src={img(s)} alt="" loading="lazy" />
        ))}
        <p className="portfolio-tag">{c.instagram}</p>
      </section>

      <section className="contact" id="contato">
        <div className="contact-head">
          <p className="eyebrow">Contato</p>
          <h2 className="display">{c.contactTitle}</h2>
          <span className="rule" aria-hidden="true" />
          <p>{c.contactText}</p>
          <dl className="contact-list">
            <div>
              <dt>E-mail</dt>
              <dd>{c.email}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{c.phone}</dd>
            </div>
            <div>
              <dt>Instagram</dt>
              <dd>{c.instagram}</dd>
            </div>
          </dl>
        </div>
        <InquiryForm services={[c.service1, c.service2, c.service3]} />
      </section>

      <footer className="footer">
        <span className="footer-brand">{c.brand}</span>
        <nav aria-label="Rodapé">
          <a href="#sobre">Sobre</a>
          <a href="#servicos">Pacotes</a>
          <a href="#portfolio">Portfólio</a>
          <a href="#contato">Contato</a>
          <Link href={clientHref}>Área do cliente</Link>
        </nav>
        <p>
          {c.city} · © {new Date().getFullYear()} {c.brand}
        </p>
      </footer>
    </div>
  );
}

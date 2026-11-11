/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Fragment } from "react";
import { getSiteContent, imageUrl, whatsappLink } from "@/lib/site-content";
import { getUser } from "@/lib/auth";
import { Testimonials } from "@/components/site/Testimonials";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Logo } from "@/components/Logo";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { RevealOnScroll } from "@/components/site/Motion";
import { Intro } from "@/components/site/Intro";
import "./site.css";
import "./motion.css";

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
      <Intro />
      <RevealOnScroll />
      <div className="topbar">
        <span>{c.announcement}</span>
        <Link href={clientHref} className="topbar-link">
          {user ? "Minha galeria" : "Área do cliente"}
        </Link>
      </div>

      <SiteHeader brand={c.brand} clientHref={clientHref} clientLabel={user ? "Minha galeria" : "Área do cliente"} />

      <section className="hero">
        <img src={img("hero")} alt="" fetchPriority="high" className="hero-img" />
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            {c.heroEyebrow.split(" ").map((w, i) => (
              <Fragment key={i}>
                <span className="hero-word" style={{ "--i": i } as React.CSSProperties}>
                  {w}
                </span>{" "}
              </Fragment>
            ))}
          </p>
          <a href="#contato" className="btn btn-ghost hero-btn">
            {c.heroButton}
          </a>
        </div>
      </section>

      <section className="intro" data-reveal="up">
        <h1 className="eyebrow eyebrow-strong">{c.introTitle}</h1>
        <span className="rule" aria-hidden="true" />
        <p>{c.introText}</p>
      </section>

      <section className="about" id="sobre">
        <div className="about-copy">
          <div className="about-text" data-reveal="right">
            <h2 className="display">
              <em>{c.aboutTitleItalic}</em> {c.aboutTitle}
            </h2>
            <p>{c.aboutText}</p>
          </div>
          <p className="side-label" aria-hidden="true">{c.aboutSide}</p>
        </div>
        <div className="about-photos">
          <img src={img("aboutSmall")} alt="" className="about-small" loading="lazy" data-reveal="pop" />
          <figure className="about-large" data-reveal="curtain">
            <img src={img("aboutLarge")} alt="" loading="lazy" data-parallax="0.06" />
            <figcaption className="script">{c.aboutScript}</figcaption>
          </figure>
        </div>
      </section>

      <section className="services" id="servicos">
        <figure className="service service-tall" data-reveal="curtain">
          <img src={img("service1")} alt="" loading="lazy" />
          <figcaption>{c.service1}</figcaption>
        </figure>
        <div className="services-side">
          <h2 className="display services-title" data-reveal="line">
            <span>
              {c.servicesItalic} <em>{c.servicesTitle}</em>
            </span>
          </h2>
          <div className="services-pair">
            <figure className="service service-a" data-reveal="up" style={{ "--d": "120ms" } as React.CSSProperties}>
              <img src={img("service2")} alt="" loading="lazy" />
              <figcaption>{c.service2}</figcaption>
            </figure>
            <figure className="service service-b" data-reveal="up" style={{ "--d": "260ms" } as React.CSSProperties}>
              <img src={img("service3")} alt="" loading="lazy" />
              <figcaption>{c.service3}</figcaption>
            </figure>
          </div>
          <a href="#contato" className="btn btn-solid services-btn" data-reveal="up" style={{ "--d": "380ms" } as React.CSSProperties}>
            {c.servicesButton} <Arrow />
          </a>
        </div>
      </section>

      <section className="mission" id="missao">
        <img src={img("mission")} alt="" loading="lazy" className="mission-img" data-parallax="0.12" />
        <div className="mission-copy" data-reveal="up">
          <p className="eyebrow eyebrow-strong">{c.missionEyebrow}</p>
          <h2 className="display">{c.missionTitle}</h2>
        </div>
      </section>

      <section className="testimonials" id="depoimentos">
        <img src={img("testimonial")} alt="" loading="lazy" className="testimonial-circle" data-reveal="pop" />
        <Testimonials items={c.testimonials} />
      </section>

      <section className="hello">
        <div className="hello-media" data-reveal="curtain">
          <img src={img("hello")} alt="" loading="lazy" className="hello-img" />
        </div>
        <div className="hello-copy">
          <p className="side-label" aria-hidden="true">{c.helloSide}</p>
          <div className="hello-text" data-reveal="left">
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
        {(["service1", "aboutLarge", "hero", "service3", "aboutSmall", "service2"] as const).map((s, i) => (
          <img key={s} src={img(s)} alt="" loading="lazy" data-reveal="up" style={{ "--d": `${i * 70}ms` } as React.CSSProperties} />
        ))}
        {c.instagram && <p className="portfolio-tag">{c.instagram}</p>}
      </section>

      <section className="contact" id="contato">
        <div className="contact-head" data-reveal="up">
          <p className="eyebrow">Contato</p>
          <h2 className="display">{c.contactTitle}</h2>
          <span className="rule" aria-hidden="true" />
          <p>{c.contactText}</p>
          <dl className="contact-list">
            {(
              [
                ["E-mail", c.email],
                ["Telefone", c.phone],
                ["Instagram", c.instagram],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </div>
        <InquiryForm services={[c.service1, c.service2, c.service3]} />
      </section>

      <footer className="footer">
        <Logo name={c.brand} height={92} className="footer-brand" />
        <nav aria-label="Rodapé">
          <a href="#sobre">Sobre</a>
          <a href="#servicos">Pacotes</a>
          <a href="#portfolio">Portfólio</a>
          <a href="#contato">Contato</a>
          <Link href={clientHref}>Área do cliente</Link>
        </nav>
        <p>
          {c.city ? `${c.city} · ` : ""}© {new Date().getFullYear()} {c.brand}
        </p>
      </footer>
      <WhatsAppButton href={whatsappLink(c)} />
    </div>
  );
}

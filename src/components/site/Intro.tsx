/* eslint-disable @next/next/no-img-element */

/**
 * Abertura do site: a logo aparece e o diafragma (como o de uma câmera) abre revelando a página.
 * Mostra uma vez por visita. Sem JavaScript, a animação em CSS termina sozinha.
 */
export function Intro() {
  return (
    <>
      <script
        // Antes da pintura: pula a abertura se já foi vista nesta visita.
        dangerouslySetInnerHTML={{
          __html:
            "try{var d=document.documentElement;if(sessionStorage.getItem('vd-intro'))d.classList.add('no-intro');else d.classList.add('intro-on');sessionStorage.setItem('vd-intro','1')}catch(e){}",
        }}
      />
      <div className="intro" aria-hidden="true">
        <div className="intro-blades">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
        <img src="/brand/logo.png" alt="" className="intro-logo" width={150} height={174} />
        <span className="intro-line" />
      </div>
    </>
  );
}

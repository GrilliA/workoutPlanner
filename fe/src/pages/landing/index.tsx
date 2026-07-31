import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandlogo";
import "./style.css";

export default function LandingPage() {
  const { status } = useAuth();
  const [, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setLocation("/dashboard");
    }
  }, [status, setLocation]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="landing landing--boot">
        <BrandLogo size="md" />
      </main>
    );
  }

  return (
    <div className="landing">
      <header className={`landing-header${scrolled ? " landing-header--scrolled" : ""}`}>
        <div className="landing-container landing-header__inner">
          <Link href="/" className="landing-logo">
            <BrandLogo size="sm" layout="inline" />
          </Link>
          <nav className="landing-nav" aria-label="Principale">
            <a href="#home">Home</a>
            <a href="#funzioni">Funzioni</a>
            <a href="#piani">Piani</a>
            <a href="#contatti">Contatti</a>
          </nav>
          <Link href="/login" className="landing-btn landing-btn--nav">
            Accedi
          </Link>
        </div>
      </header>

      <section className="landing-hero" id="home">
        <div className="landing-container">
          <div className="landing-hero__logo">
            <BrandLogo size="lg" layout="stack" />
          </div>
          <h1>Visualizza il tuo percorso. Raggiungi i tuoi obiettivi.</h1>
          <p>
            La piattaforma definitiva per monitorare progressi, tracciare
            attività e ottimizzare le tue performance. Inizia oggi.
          </p>
          <Link href="/register" className="landing-btn landing-btn--trial">
            Prova Gratuita
          </Link>
        </div>
      </section>

      <div className="landing-container landing-float" aria-hidden="true">
        <div className="landing-map">Percorso</div>
        <div className="landing-triangle" />
      </div>

      <section className="landing-section" id="funzioni">
        <div className="landing-container">
          <h2>Funzioni</h2>
          <div className="landing-cards">
            <article>
              <h3>Schede e template</h3>
              <p>Crea programmi, importali da TXT e assegnarli ai clienti.</p>
            </article>
            <article>
              <h3>Scadenze sotto controllo</h3>
              <p>Dashboard coach con clienti attivi e date di validità.</p>
            </article>
            <article>
              <h3>Logging mobile</h3>
              <p>Gli atleti eseguono e registrano le serie dall&apos;app.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section" id="piani">
        <div className="landing-container landing-section--narrow">
          <h2>Piani</h2>
          <p>
            Inizia gratis come coach: registra l&apos;account, crea i clienti e
            assegna la prima scheda in pochi minuti.
          </p>
          <Link href="/register" className="landing-btn landing-btn--trial">
            Crea account coach
          </Link>
        </div>
      </section>

      <footer className="landing-footer" id="contatti">
        <div className="landing-container landing-footer__inner">
          <p>Traccia © {new Date().getFullYear()} Traccia Tech</p>
          <div className="landing-social">
            <a href="https://x.com" target="_blank" rel="noreferrer" title="X">
              X
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              title="Instagram"
            >
              IG
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              title="YouTube"
            >
              YT
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

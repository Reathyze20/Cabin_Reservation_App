import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '@/styles/landing.css'

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export function LandingPage() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // ── Nav shrink on scroll ──
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 60)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Scroll reveal ──
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('revealed'))
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '-40px 0px' }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // ── Seasonal pricing ──
  const getSeasonalPricing = useCallback(() => {
    const month = new Date().getMonth() + 1
    const FULL_PRICE = 490
    const MONTHLY_RATE = 70
    if (month < 4 || month > 10) {
      return { price: FULL_PRICE, subtitle: 'Na celou sezónu', explanation: 'Vychází na 40\u00a0Kč měs. Zima je zdarma.' }
    }
    const monthsLeft = 11 - month
    return {
      price: monthsLeft * MONTHLY_RATE,
      subtitle: `Za zbývající ${monthsLeft} měsíce`,
      explanation: 'Aplikace odečetla měsíce, které už uplynuly. Zima je navždy zdarma.'
    }
  }, [])

  const seasonal = getSeasonalPricing()

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev)
  }

  const goToLogin = () => navigate('/login')

  const smoothScroll = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    closeMobileMenu()
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* ========== GLASS NAVIGATION ========== */}
      <nav className={`landing-nav${scrolled ? ' scrolled' : ''}`} id="landing-nav" data-testid="landing-nav">
        <a href="/" className="landing-nav-logo" onClick={e => { e.preventDefault() }} data-testid="landing-home-link">
          <img src="/logo-icon.svg" alt="Chatačeskéstředohoří" className="landing-nav-logo-img" />
          <span className="landing-nav-logo-text">Chatačeskéstředohoří</span>
        </a>

        <div className="landing-nav-links">
          <a href="#funkce" className="landing-nav-link" onClick={smoothScroll('funkce')}>Funkce</a>
          <a href="#jak-to-funguje" className="landing-nav-link" onClick={smoothScroll('jak-to-funguje')}>Jak to funguje</a>
          <a href="#cenik" className="landing-nav-link" onClick={smoothScroll('cenik')}>Ceník</a>
        </div>

        <div className="landing-nav-actions">
          <button className="landing-btn landing-btn-ghost" onClick={goToLogin} data-testid="landing-login-button">Přihlásit se</button>
          <button className="landing-btn landing-btn-primary landing-btn-sm" onClick={goToLogin} data-testid="landing-trial-button">Vyzkoušet zdarma</button>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`landing-nav-hamburger${mobileMenuOpen ? ' active' : ''}`}
          aria-label="Otevřít menu"
          onClick={toggleMobileMenu}
          data-testid="landing-mobile-menu-button"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div className={`landing-mobile-menu${mobileMenuOpen ? ' open' : ''}`} data-testid="landing-mobile-menu">
        <a href="#funkce" className="landing-mobile-link" onClick={smoothScroll('funkce')}>Funkce</a>
        <a href="#jak-to-funguje" className="landing-mobile-link" onClick={smoothScroll('jak-to-funguje')}>Jak to funguje</a>
        <a href="#cenik" className="landing-mobile-link" onClick={smoothScroll('cenik')}>Ceník</a>
        <hr className="landing-mobile-divider" />
        <button className="landing-btn landing-btn-ghost" style={{ width: '100%', textAlign: 'center' }} onClick={goToLogin} data-testid="landing-mobile-login-button">Přihlásit se</button>
        <button className="landing-btn landing-btn-primary" style={{ width: '100%', textAlign: 'center' }} onClick={goToLogin} data-testid="landing-mobile-trial-button">Vyzkoušet zdarma</button>
      </div>

      {/* ========== HERO SECTION ========== */}
      <section className="hero-section" data-testid="landing-hero-section">
        <div className="hero-overlay"></div>

        {/* Decorative blobs */}
        <div className="hero-blob hero-blob-1"></div>
        <div className="hero-blob hero-blob-2"></div>
        <div className="hero-blob hero-blob-3"></div>

        {/* Content */}
        <div className="hero-content">
          <h1 className="hero-title">
            Konečně pořádek.<br /><span className="hero-title-accent">S radostí, bez hádek.</span>
          </h1>

          <p className="hero-subtitle">
            Sdílejte kalendář, nakupujte chytře a&nbsp;plánujte údržbu vaší chalupy.
            Jedna aplikace, která sjednotí celou rodinu.
          </p>

          <div className="hero-cta-group">
            <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={goToLogin} data-testid="landing-hero-primary-cta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
              Vyzkoušet zdarma
            </button>
            <a href="#funkce" className="landing-btn landing-btn-outline landing-btn-lg" onClick={smoothScroll('funkce')} data-testid="landing-hero-secondary-cta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Ukázka aplikace
            </a>
          </div>
        </div>

        {/* Mockup */}
        <div className="hero-mockup-wrapper">
          <div className="hero-mockup">
            <div className="hero-mockup-bar">
              <span className="mockup-dot mockup-dot--red"></span>
              <span className="mockup-dot mockup-dot--yellow"></span>
              <span className="mockup-dot mockup-dot--green"></span>
              <span className="mockup-bar-url">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-placeholder, #9ca3af)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                chataceskestredohori.cz/dashboard
              </span>
            </div>
            <img src="/dashboard-mockup.jpg" alt="Náhled aplikace Chatačeskéstředohoří — dashboard s rezervacemi, počasím a nákupy" className="mockup-image" loading="eager" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll-indicator">
          <span>Zjistit více</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="funkce" className="landing-section landing-section--white">
        <div className="landing-section-inner">
          <h2 className="landing-section-title reveal">Všechno co potřebujete, na jednom místě</h2>
          <p className="landing-section-subtitle reveal reveal-delay-1">
            Rezervace, nákupy, galerie, deník, nástěnka i plánování rekonstrukce — v jedné přehledné aplikaci.
          </p>
          <div className="feature-grid">
            <article className="feature-card reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3>Chytrý kalendář rezervací</h3>
              <p>Okamžitě vidíte, kdo kdy jede na chatu. Přehled měsíců, konflikty i osobní volno na jednom místě.</p>
            </article>
            <article className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <h3>Sdílené nákupy</h3>
              <p>Už žádné duplicitní nákupy. Každý ví, co chybí a co je už koupené.</p>
            </article>
            <article className="feature-card reveal reveal-delay-3">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h3>Rekonstrukce pod kontrolou</h3>
              <p>Nápady, firmy, úkoly i rozpočet přehledně v kanban pohledu.</p>
            </article>
            <article className="feature-card reveal reveal-delay-1">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3>Sdílená galerie</h3>
              <p>Fotky z víkendovek na jednom místě. Každý člen rodiny může přidávat, komentovat a sdílet vzpomínky.</p>
            </article>
            <article className="feature-card reveal reveal-delay-2">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3>Chatový deník</h3>
              <p>Záznamy o tom, kdo co udělal, opravil, nakoupil. Historie chaty na jednom místě.</p>
            </article>
            <article className="feature-card reveal reveal-delay-3">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Nástěnka a vzkazy</h3>
              <p>Důležité informace a vzkazy pro další návštěvníky. Všichni vědí, na co si dát pozor.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="jak-to-funguje" className="landing-section landing-section--alt">
        <div className="landing-section-inner">
          <h2 className="landing-section-title reveal">Jak to funguje</h2>
          <p className="landing-section-subtitle reveal reveal-delay-1">
            Nastavení zvládnete za pár minut. Pak už jen sdílíte termíny, úkoly a nákupy.
          </p>
          <div className="steps-grid">
            <article className="step-card reveal reveal-delay-1">
              <div className="step-number">1</div>
              <h3>Vytvoříte účet</h3>
              <p>Přihlásíte sebe a pozvete rodinu. Každý dostane vlastní přístup.</p>
            </article>
            <article className="step-card reveal reveal-delay-2">
              <div className="step-number">2</div>
              <h3>Nastavíte pravidla</h3>
              <p>Definujete role, dostupnost a první seznamy. Všichni vidí stejná data.</p>
            </article>
            <article className="step-card reveal reveal-delay-3">
              <div className="step-number">3</div>
              <h3>Používáte každý den</h3>
              <p>Rezervace, nákupní seznamy a úkoly máte na jednom místě pro celou rodinu.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ========== FOUNDER'S STORY ========== */}
      <section id="founders-story" className="landing-section founder-section">
        <div className="landing-section-inner">
          <div className="founder-card reveal">
            <div className="founder-photo-wrapper">
              <div className="founder-photo-placeholder">—</div>
            </div>
            <div className="founder-text">
              <h2 className="founder-headline">Od chataře pro chataře.</h2>
              <blockquote className="founder-quote">
                <p>
                  Miluji přírodu, klid a čas na chalupě. Je to pro mě oáza — zvlášť od doby,
                  kdy mi do života vstoupila roztroušená skleróza (RS). Odbourání zbytečného
                  stresu se stalo nutností.
                </p>
                <p>
                  V rodině jsme ale neustále řešili, kdo na chatě je, jestli došel plyn nebo
                  kdo zrovna nakoupí. Tyhle zmatky měnily odpočinek ve stres. Proto jsem
                  vytvořil <strong>Chatačeskéstředohoří</strong>. Abychom se zbavili dohadování
                  a vrátili se k tomu hlavnímu — radosti z přírody.
                </p>
                <p>Věřím, že to pomůže i vám.</p>
              </blockquote>
              <div className="founder-signature">
                <span className="founder-name">Tomáš Rambousek</span>
                <span className="founder-role">Tvůrce aplikace</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="cenik" className="landing-section landing-section--white">
        <div className="landing-section-inner">
          <h2 className="landing-section-title reveal">Jednoduchý ceník, žádné háčky</h2>
          <p className="landing-section-subtitle reveal reveal-delay-1">
            Vyberte si, co vám sedí. Kdykoliv můžete změnit nebo zrušit.
          </p>

          <div className="pricing-cards-container reveal reveal-delay-2">
            {/* Karta 1: Základ */}
            <article className="pricing-card">
              <div className="pricing-card-top">
                <h3 className="pricing-plan">Rodinný základ</h3>
                <div className="pricing-price" style={{ marginBottom: 8 }}>
                  <span className="pricing-amount">0</span>
                  <span className="pricing-currency">Kč <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/ navždy</span></span>
                </div>
                <p className="pricing-plan-desc">Pro běžný chod jedné chalupy.</p>
              </div>
              <ul className="pricing-list">
                <li><CheckIcon /><span>Sdílený Dashboard</span></li>
                <li><CheckIcon /><span>Nákupy a Zásoby</span></li>
                <li><CheckIcon /><span>Až pro 3 členy</span></li>
              </ul>
              <button className="pricing-btn pricing-btn-ghost" onClick={goToLogin}>Založit zdarma</button>
            </article>

            {/* Karta 2: Měsíčně */}
            <article className="pricing-card">
              <div className="pricing-card-top">
                <h3 className="pricing-plan">Měsíčně</h3>
                <div className="pricing-price" style={{ marginBottom: 8 }}>
                  <span className="pricing-amount">89</span>
                  <span className="pricing-currency">Kč <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/ měsíc</span></span>
                </div>
                <p className="pricing-plan-desc">Absolutní flexibilita. Zapněte si to třeba jen na prázdniny.</p>
              </div>
              <ul className="pricing-list">
                <li><CheckIcon /><span>Neomezeně členů</span></li>
                <li><CheckIcon /><span>Fotogalerie a deník</span></li>
                <li><CheckIcon /><span>Plánovač údržby</span></li>
              </ul>
              <button className="pricing-btn pricing-btn-secondary" onClick={goToLogin}>Platit měsíčně</button>
            </article>

            {/* Karta 3: Sezónní */}
            <article className="pricing-card">
              <div className="pricing-card-top">
                <h3 className="pricing-plan">Sezónní Předplatné</h3>
                <div className="pricing-price" style={{ marginBottom: 8 }}>
                  <span className="pricing-amount">{seasonal.price.toLocaleString('cs-CZ')}</span>
                  <span className="pricing-currency">Kč</span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-primary, #5d9b62)', textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
                  {seasonal.subtitle}
                </div>
                <p className="pricing-plan-desc" style={{ marginTop: 8 }}>{seasonal.explanation}</p>
              </div>
              <ul className="pricing-list">
                <li><CheckIcon /><span>Vše z Měsíčního plánu</span></li>
                <li><CheckIcon /><span>Navíc varování před mrazy</span></li>
                <li><CheckIcon /><span>Nejlepší poměr cena/výkon</span></li>
              </ul>
              <button className="pricing-btn pricing-btn-primary" onClick={goToLogin}>Pořídit na sezónu</button>
            </article>
          </div>

          <div className="pricing-community-note reveal reveal-delay-3">
            <strong>Stavíme to společně.</strong> Jako předplatitel získáte pozvánku na náš soukromý Discord, kde můžete ovlivnit další vývoj.
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="landing-cta-section reveal">
        <div className="landing-cta-inner">
          <h2>Připraveni na pořádek na chatě?</h2>
          <p>Začněte zdarma, bez závazků. Pozvěte rodinu a vše si vyzkoušejte.</p>
          <div className="landing-cta-buttons">
            <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={goToLogin}>Vyzkoušet zdarma</button>
            <a href="#funkce" className="landing-btn landing-btn-outline landing-btn-lg" onClick={smoothScroll('funkce')}>Prozkoumat funkce</a>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-col footer-brand">
            <div className="footer-logo">
              <img src="/logo-icon.svg" alt="Chatačeskéstředohoří" width="28" height="28" />
              <span>Chatačeskéstředohoří</span>
            </div>
            <p>Rodinná aplikace pro správu chaty a chalupy. Konečně pořádek bez hádek.</p>
          </div>
          <div className="footer-col">
            <h4>Produkt</h4>
            <a href="#funkce" onClick={smoothScroll('funkce')}>Funkce</a>
            <a href="#jak-to-funguje" onClick={smoothScroll('jak-to-funguje')}>Jak to funguje</a>
            <a href="#cenik" onClick={smoothScroll('cenik')}>Ceník</a>
          </div>
          <div className="footer-col">
            <h4>Právní</h4>
            <Link to="/terms">Obchodní podmínky</Link>
            <Link to="/privacy">Ochrana soukromí</Link>
            <Link to="/privacy#cookies">Cookies</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 Chatačeskéstředohoří — Všechna práva vyhrazena.</span>
        </div>
      </footer>
    </>
  )
}

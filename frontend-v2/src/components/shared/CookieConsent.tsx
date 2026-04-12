/**
 * CookieConsent.tsx — GDPR informační banner (s trochou humoru)
 * Informuje uživatele o tom, co ukládáme v prohlížeči.
 * Nepoužíváme tracking → nepotřebujeme granulární souhlas,
 * ale EU ePrivacy + GDPR vyžadují jasné informování.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '@/styles/legal.css'

const CONSENT_KEY = 'cookieConsent'

const COOKIE_JOKES = [
  'Bohužel nejde sníst.',
  'Bez cukru, bez mouky. Asi dieta.',
  'Upozornění: Nejedná se o linecké.',
  'Vanilkových rohlíčků se netýká.',
  'Čokoládové naneštěstí nejsou součástí balení.',
  '* Neobsahují tvaroh ani džem.',
  'Cookie Monster byl zklamán.',
  'Konzumace těchto cookies nenasytí.',
]

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [joke] = useState(() => COOKIE_JOKES[Math.floor(Math.random() * COOKIE_JOKES.length)])

  useEffect(() => {
    const accepted = localStorage.getItem(CONSENT_KEY)
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cookie-consent-banner" role="dialog" aria-label="Informace o zpracování dat">
      <div className="cookie-consent-body">
        <h3 className="cookie-consent-title">
          <img src="/icons/cookies_icon.svg" alt="" aria-hidden="true" className="cookie-consent-icon" />
          Používáme cookies!
        </h3>
        <p className="cookie-consent-text">
          <strong>Ukládáme cookies.</strong> Tyhle cookies ale bohužel nejsou k jídlu —
          slouží jen k přihlášení a základnímu fungování aplikace.
          Žádné sledování, žádná reklama, žádné sdílení s třetími stranami.
        </p>
        <p className="cookie-consent-joke">
          <em>{joke}</em>
        </p>

        {showDetail && (
          <div className="cookie-consent-detail">
            <div className="cookie-detail-items">
              <div className="cookie-detail-item">
                <span>●</span>
                <div><strong>Přihlášení</strong><span>Abyste nemuseli zadávat heslo pokaždé znovu (30 dní)</span></div>
              </div>
              <div className="cookie-detail-item">
                <span>●</span>
                <div><strong>Vaše chata</strong><span>Abychom věděli, ke které chatě patříte</span></div>
              </div>
              <div className="cookie-detail-item">
                <span>●</span>
                <div><strong>Vzhled</strong><span>Vaše preference světlého/tmavého režimu</span></div>
              </div>
              <div className="cookie-detail-item">
                <span>●</span>
                <div><strong>Toto oznámení</strong><span>Aby se vám tenhle výkřik GDPR nezobrazoval znovu</span></div>
              </div>
            </div>
            <p className="cookie-consent-footnote">
              Vše výše je technicky nezbytné. Dle EU legislativy nepotřebujeme souhlas,
              ale aspoň víte co máte v košíku. Bez sušenek, bohužel.
            </p>
          </div>
        )}

        <div className="cookie-consent-actions">
          <button
            type="button"
            className="cookie-consent-detail-btn"
            onClick={() => setShowDetail(!showDetail)}
          >
            {showDetail ? 'Skrýt podrobnosti' : 'Jaké cookies? (ne ty dobré)'}
          </button>
          <div className="cookie-consent-buttons">
            <Link to="/privacy" className="cookie-consent-link">
              Ochrana soukromí
            </Link>
            <button className="cookie-consent-accept" onClick={handleAccept}>
              Rozumím
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

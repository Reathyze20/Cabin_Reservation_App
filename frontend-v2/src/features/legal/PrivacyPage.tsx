/**
 * PrivacyPage.tsx — Ochrana osobních údajů (GDPR / Privacy Policy)
 */
import { Link } from 'react-router-dom'
import '@/styles/legal.css'

export function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-link">← Zpět na úvod</Link>

        <h1>Ochrana vašich údajů</h1>
        <p className="legal-subtitle">Chceme, abyste věděli, jak s vašimi daty nakládáme. Jednoduše a srozumitelně.</p>
        <p className="legal-updated">Poslední aktualizace: 12. dubna 2026</p>

        <section>
          <h2>Kdo jsme</h2>
          <p>
            Provozovatelem služby <strong>kdynachatu.cz</strong> je její autor.
            Pokud máte jakýkoli dotaz, napište nám na <a href="mailto:info@kdynachatu.cz">info@kdynachatu.cz</a>.
          </p>
        </section>

        <section>
          <h2>Co o vás víme</h2>
          <div className="legal-info-cards">
            <div className="legal-info-card">
              <strong>Při registraci</strong>
              <span>Uživatelské jméno, e-mail a heslo (heslo ukládáme zašifrované, nikdy ho nevidíme v čitelné podobě)</span>
            </div>
            <div className="legal-info-card">
              <strong>Váš profil</strong>
              <span>Barva profilu a avatar, které si sami zvolíte</span>
            </div>
            <div className="legal-info-card">
              <strong>Co vytvoříte</strong>
              <span>Rezervace, zprávy, fotky, zápisky v deníku, nákupní seznamy a položky rekonstrukce</span>
            </div>
            <div className="legal-info-card">
              <strong>Technické údaje</strong>
              <span>IP adresa a typ prohlížeče — potřebujeme je pro bezpečnost a řešení problémů</span>
            </div>
          </div>
        </section>

        <section>
          <h2>Proč vaše údaje potřebujeme</h2>
          <ul>
            <li>Aby aplikace fungovala — rezervace, sdílení s členy chaty, přihlašování</li>
            <li>Abychom chránili váš účet před neoprávněným přístupem</li>
            <li>Abychom vám mohli poslat důležité e-maily (ověření účtu)</li>
          </ul>
          <p className="legal-highlight">
            Neposíláme reklamy, newslettery ani marketingové e-maily.
          </p>
        </section>

        <section>
          <h2>Kdo vidí vaše údaje</h2>
          <ul>
            <li><strong>Členové vaší chaty</strong> — vidí vaše jméno, avatar, rezervace a obsah, který vytvoříte</li>
            <li><strong>Poskytovatel hostingu</strong> — data jsou uložena na serveru v ČR</li>
          </ul>
          <p className="legal-highlight">
            Vaše údaje neprodáváme. Nesdílíme je s reklamními sítěmi. Nemáme žádné „partnery" kteří by k nim měli přístup.
          </p>
        </section>

        <section>
          <h2>Jak dlouho data uchováváme</h2>
          <p>
            Vaše data existují, dokud máte účet. Když svůj účet smažete,
            všechna vaše data odstraníme <strong>okamžitě a nenávratně</strong>.
          </p>
        </section>

        <section>
          <h2>Co můžete udělat se svými daty</h2>
          <div className="legal-rights-grid">
            <div className="legal-right-item">
              <span className="legal-right-icon">↓</span>
              <div>
                <strong>Stáhnout si je</strong>
                <span>V nastavení profilu tlačítkem „Exportovat moje data"</span>
              </div>
            </div>
            <div className="legal-right-item">
              <span className="legal-right-icon">✎</span>
              <div>
                <strong>Upravit je</strong>
                <span>E-mail, jméno a profil můžete kdykoli změnit</span>
              </div>
            </div>
            <div className="legal-right-item">
              <span className="legal-right-icon">×</span>
              <div>
                <strong>Smazat vše</strong>
                <span>V nastavení profilu můžete smazat celý účet</span>
              </div>
            </div>
            <div className="legal-right-item">
              <span className="legal-right-icon">→</span>
              <div>
                <strong>Podat stížnost</strong>
                <span>U Úřadu pro ochranu osobních údajů (uoou.gov.cz)</span>
              </div>
            </div>
          </div>
        </section>

        <section id="cookies">
          <h2>Co ukládáme ve vašem prohlížeči</h2>
          <p>
            <strong>Nepoužíváme sledovací cookies.</strong> Žádný Google Analytics, Facebook Pixel
            ani jiné sledovací nástroje. Na vašem počítači si pamatujeme jen to, co je nezbytné:
          </p>
          <div className="legal-storage-list">
            <div className="legal-storage-item">
              <span className="legal-storage-icon">●</span>
              <div>
                <strong>Přihlašovací údaje</strong>
                <span>Abyste nemuseli zadávat heslo při každé návštěvě. Platí 30 dní nebo do odhlášení.</span>
              </div>
            </div>
            <div className="legal-storage-item">
              <span className="legal-storage-icon">●</span>
              <div>
                <strong>Identifikace chaty</strong>
                <span>Abychom věděli, ke které chatě patříte.</span>
              </div>
            </div>
            <div className="legal-storage-item">
              <span className="legal-storage-icon">●</span>
              <div>
                <strong>Vzhled aplikace</strong>
                <span>Vaše preference tmavého/světlého režimu a pozadí.</span>
              </div>
            </div>
            <div className="legal-storage-item">
              <span className="legal-storage-icon">●</span>
              <div>
                <strong>Souhlas s tímto oznámením</strong>
                <span>Aby se vám tento banner nezobrazoval znovu.</span>
              </div>
            </div>
          </div>
          <p className="legal-note">
            Tato data jsou technicky nezbytná pro fungování aplikace a dle EU legislativy
            (ePrivacy směrnice) nevyžadují váš souhlas. Informujeme vás o nich z důvodu transparentnosti.
            Můžete je kdykoli smazat vymazáním dat prohlížeče — poté budete odhlášeni.
          </p>
        </section>

        <section>
          <h2>Jak chráníme vaše data</h2>
          <ul>
            <li>Hesla ukládáme zašifrovaná — ani my je nevidíme</li>
            <li>Komunikace probíhá přes šifrované HTTPS spojení</li>
            <li>Přístup k datům je chráněn přihlašovacím tokenem a ověřením příslušnosti k chatě</li>
          </ul>
        </section>

        <section>
          <h2>Kontakt</h2>
          <p>
            Máte otázky ohledně svých údajů? Napište nám na{' '}
            <a href="mailto:info@kdynachatu.cz">info@kdynachatu.cz</a> — rádi odpovíme.
          </p>
        </section>

        <div className="legal-footer-nav">
          <Link to="/terms">Obchodní podmínky</Link>
          <Link to="/">Zpět na úvod</Link>
        </div>
      </div>
    </div>
  )
}

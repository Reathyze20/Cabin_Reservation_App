/**
 * TermsPage.tsx — Obchodní podmínky (Terms of Service)
 */
import { Link } from 'react-router-dom'
import '@/styles/legal.css'

export function TermsPage() {
  return (
    <div className="legal-page" data-testid="terms-page">
      <div className="legal-container">
        <Link to="/" className="legal-back-link" data-testid="terms-back-link">← Zpět na úvod</Link>

        <h1>Obchodní podmínky</h1>
        <p className="legal-subtitle">Pravidla hry — co od nás můžete čekat a co očekáváme my od vás.</p>
        <p className="legal-updated">Poslední aktualizace: 12. dubna 2026</p>

        <section>
          <h2>1. Úvodní ustanovení</h2>
          <p>
            Tyto obchodní podmínky upravují vztah mezi provozovatelem služby <strong>Chatačeskéstředohoří</strong>
            (dále jen „Provozovatel") a uživatelem služby (dále jen „Uživatel").
          </p>
          <p>
            Registrací a používáním služby Uživatel souhlasí s těmito podmínkami.
          </p>
        </section>

        <section>
          <h2>2. Popis služby</h2>
          <p>
            Chatačeskéstředohoří je webová aplikace pro správu sdílených rekreačních objektů (chat, chalup).
            Služba umožňuje správu rezervací, nákupních seznamů, galerie, deníku pobytů,
            chatu mezi členy a plánování rekonstrukcí.
          </p>
        </section>

        <section>
          <h2>3. Registrace a účet</h2>
          <ul>
            <li>Pro využívání služby je nutná registrace s platnou e-mailovou adresou.</li>
            <li>Uživatel je povinen uvádět pravdivé údaje a udržovat své přihlašovací údaje v tajnosti.</li>
            <li>Uživatel nesmí sdílet svůj účet s třetími osobami.</li>
            <li>Uživatel může svůj účet kdykoli smazat v nastavení profilu.</li>
          </ul>
        </section>

        <section>
          <h2>4. Pravidla používání</h2>
          <p>Uživatel se zavazuje:</p>
          <ul>
            <li>Nepoužívat službu k protiprávním účelům</li>
            <li>Nenahrávat obsah porušující práva třetích osob (autorská práva, osobnostní práva)</li>
            <li>Nezasahovat do technického fungování služby</li>
            <li>Neobtěžovat ostatní uživatele nevyžádanými zprávami</li>
          </ul>
        </section>

        <section>
          <h2>5. Obsah uživatelů</h2>
          <p>
            Uživatel zůstává vlastníkem veškerého obsahu, který do služby nahraje (fotografie, texty, záznamy).
            Provozovatel nezískává žádná práva k tomuto obsahu nad rámec nezbytný pro provoz služby.
          </p>
          <p>
            Provozovatel si vyhrazuje právo odstranit obsah, který porušuje tyto podmínky
            nebo platné právní předpisy.
          </p>
        </section>

        <section>
          <h2>6. Dostupnost služby</h2>
          <p>
            Provozovatel se snaží zajistit nepřetržitou dostupnost služby, ale negarantuje
            100% dostupnost. Služba může být dočasně nedostupná z důvodu údržby nebo technických problémů.
          </p>
        </section>

        <section>
          <h2>7. Odpovědnost</h2>
          <ul>
            <li>Provozovatel neodpovídá za obsah vytvořený uživateli.</li>
            <li>Provozovatel neodpovídá za škody způsobené výpadkem služby.</li>
            <li>Provozovatel zajišťuje pravidelné zálohování dat, ale negarantuje 100% ochranu proti ztrátě dat.</li>
          </ul>
        </section>

        <section>
          <h2>8. Cenové podmínky</h2>
          <p>
            Služba nabízí bezplatný i placené tarify. Aktuální ceník je uveden na stránce
            <Link to="/"> Chatačeskéstředohoří</Link>. Provozovatel si vyhrazuje právo změnit cenové podmínky
            s předchozím upozorněním stávajících uživatelů.
          </p>
        </section>

        <section>
          <h2>9. Ukončení služby</h2>
          <ul>
            <li>Uživatel může kdykoli přestat službu používat a smazat svůj účet.</li>
            <li>Provozovatel může zablokovat účet uživatele, který porušuje tyto podmínky.</li>
            <li>V případě ukončení služby bude Provozovatel informovat uživatele alespoň 30 dní předem
                a umožní export dat.</li>
          </ul>
        </section>

        <section>
          <h2>10. Ochrana osobních údajů</h2>
          <p>
            Zpracování osobních údajů se řídí <Link to="/privacy">Zásadami ochrany osobních údajů</Link>.
          </p>
        </section>

        <section>
          <h2>11. Změny podmínek</h2>
          <p>
            Provozovatel si vyhrazuje právo tyto podmínky změnit. O změnách bude Uživatel informován
            prostřednictvím e-mailu nebo oznámení v aplikaci. Pokračováním v používání služby
            po změně podmínek Uživatel vyjadřuje souhlas s novým zněním.
          </p>
        </section>

        <section>
          <h2>12. Kontakt</h2>
          <p>
            V případě dotazů kontaktujte: <a href="mailto:noreply@chataceskestredohori.cz">noreply@chataceskestredohori.cz</a>.
          </p>
        </section>

        <div className="legal-footer-nav">
          <Link to="/privacy">Ochrana soukromí</Link>
          <Link to="/">Zpět na úvod</Link>
        </div>
      </div>
    </div>
  )
}

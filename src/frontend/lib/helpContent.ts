/* ============================================================================
   lib/helpContent.ts — Kontextová nápověda pro každou stránku
   ============================================================================ */

export const helpDictionary: Record<string, string> = {

    dashboard: `
    <h3>📊 Přehled (Dashboard)</h3>
    <p>Zde najdete souhrn aktuálního dění na chatě — nadcházející rezervace, počasí, rychlé statistiky a upozornění.</p>
    <ul>
      <li><strong>Widgety</strong> zobrazují nejdůležitější informace na jednom místě.</li>
      <li><strong>Odjezdový protokol</strong> — pokud dnes odjíždíte, nezapomeňte vyplnit předávací formulář.</li>
      <li>Kliknutím na widget se přesunete na příslušnou stránku.</li>
    </ul>
  `,

    reservations: `
    <h3>📅 Rezervace</h3>
    <p>Správa pobytů na chatě. Můžete si zarezervovat termín, spravovat stávající rezervace a sledovat dostupnost.</p>
    <ul>
      <li><strong>Kalendář</strong> — barevně odlišené rezervace. Kliknutím na den otevřete detail.</li>
      <li><strong>Nová rezervace</strong> — vyberte datum příjezdu a odjezdu, zadejte účel návštěvy.</li>
      <li><strong>Editace</strong> — své rezervace můžete upravit nebo smazat kliknutím na ně.</li>
      <li><strong>Dostupnost</strong> — přidejte svou osobní dostupnost, aby ostatní věděli, kdy můžete na chatu.</li>
    </ul>
  `,

    notes: `
    <h3>💬 Chat</h3>
    <p>Rodinný chat — komunikujte s ostatními členy rodiny, sdílejte informace a plánujte pobyt.</p>
    <ul>
      <li><strong>Vlákna</strong> — zprávy jsou organizovány do tematických vláken. Vyberte téma v levém panelu.</li>
      <li><strong>Nové téma</strong> — klikněte na „+" pro vytvoření nového vlákna.</li>
      <li><strong>Zprávy</strong> — zadejte text a odešlete. Podporujeme maximálně 2000 znaků na zprávu.</li>
    </ul>
  `,

    shopping: `
    <h3>🛒 Nákupy & Zásoby</h3>
    <p>Spravujte nákupní seznamy a virtuální spíž. Víte vždy, co je na chatě a co je potřeba dokoupit.</p>
    <ul>
      <li><strong>Nákupní seznam</strong> — přidejte položky, kliknutím na kolečko je odškrtněte.</li>
      <li><strong>Virtuální spíž</strong> — sledujte, co je aktuálně na chatě. Ikona domečku = „mám doma".</li>
      <li><strong>Nový seznam</strong> — vytvořte si vlastní seznam pro konkrétní nákup.</li>
      <li><strong>Sdílení</strong> — seznamy automaticky vidí všichni členové rodiny.</li>
    </ul>
  `,

    gallery: `
    <h3>🖼️ Galerie</h3>
    <p>Sdílená fotogalerie pro všechny pobyty. Nahrajte fotky, popisujte je a prohlížejte si vzpomínky.</p>
    <ul>
      <li><strong>Složky</strong> — fotky jsou organizovány do složek (např. podle pobytů).</li>
      <li><strong>Nahrávání</strong> — klikněte na „+" ve složce pro přidání nových fotek.</li>
      <li><strong>Lightbox</strong> — klikněte na fotku pro zobrazení v plné velikosti. Šipkami listujte.</li>
      <li><strong>Stahování</strong> — v lightboxu můžete fotku stáhnout přes odkaz „Stáhnout".</li>
    </ul>
  `,

    diary: `
    <h3>📖 Deník</h3>
    <p>Zapisujte si zážitky z jednotlivých pobytů. Každý den má svou „stránku" v sešitě.</p>
    <ul>
      <li><strong>Pobyty</strong> — vytvořte nový pobyt (ručně nebo z rezervace) a pak vyplňujte jednotlivé dny.</li>
      <li><strong>Kalendář dnů</strong> — každý den pobytu je karta, klikněte pro otevření zápisníku.</li>
      <li><strong>Fotky</strong> — ke každému dni můžete připojit fotky z galerie.</li>
      <li><strong>Šablony témat</strong> — vyberte téma (houbaření, výlet, oslava) pro rychlou orientaci.</li>
    </ul>
  `,

    reconstruction: `
    <h3>🔨 Rekonstrukce</h3>
    <p>Kanban nástěnka pro plánování a sledování úprav na chatě — od nápadu po dokončení.</p>
    <ul>
      <li><strong>Nápady</strong> — inspirace z e-shopů, fotky, odhadovaná cena. Hlasujte ❤️ pro prioritizaci.</li>
      <li><strong>Firmy / Kontakty</strong> — kontakty na řemeslníky a firmy. Sledujte stav spolupráce.</li>
      <li><strong>Úkoly</strong> — konkrétní práce s termínem a rozpočtem. Zaškrtněte po dokončení.</li>
      <li><strong>Rozpočet</strong> — celkový přehled plánovaných a skutečných nákladů nahoře.</li>
    </ul>
  `,

    admin: `
    <h3>⚙️ Administrace</h3>
    <p>Správa uživatelů a systémové nastavení. Pouze pro administrátory.</p>
    <ul>
      <li><strong>Uživatelé</strong> — přehled registrovaných účtů, jejich rolí a stavu.</li>
      <li><strong>Správa rolí</strong> — změna role uživatele (admin / člen).</li>
    </ul>
  `,

    default: `
    <h3>❓ Nápověda</h3>
    <p>Vítejte v aplikaci <strong>Chata Třebenice</strong> — rodinné aplikaci pro správu chaty.</p>
    <p>Pomocí horní navigace přepínáte mezi sekcemi. Každá stránka má vlastní nápovědu — stačí kliknout na toto tlačítko.</p>
    <ul>
      <li><strong>Přehled</strong> — souhrn dění na chatě</li>
      <li><strong>Rezervace</strong> — správa pobytů</li>
      <li><strong>Chat</strong> — komunikace s rodinou</li>
      <li><strong>Nákupy</strong> — nákupní seznamy a spíž</li>
      <li><strong>Galerie</strong> — společné fotky</li>
      <li><strong>Deník</strong> — zápisky z pobytů</li>
      <li><strong>Rekonstrukce</strong> — plánování oprav</li>
    </ul>
  `,
};

# Dokumentace a Návod ke Zprovoznění Aplikace pro Rezervaci Chaty

Tento dokument slouží jako průvodce pro lokální instalaci, spuštění a pochopení struktury rezervační aplikace.

---

## 1. Potřebný Software

Před spuštěním aplikace se ujistěte, že máte nainstalovaný následující software:

- **Node.js a npm**  
    Aplikace je postavena na Node.js. npm (Node Package Manager) je součástí instalace a slouží ke správě závislostí projektu. Stahujte z [oficiálních stránek Node.js](https://nodejs.org/).

- **Textový editor**  
    Doporučujeme [Visual Studio Code](https://code.visualstudio.com/), protože projekt již obsahuje specifická nastavení pro tento editor.

- **Doplněk "Live Server" pro VS Code**  
    Tento doplněk usnadňuje spuštění frontendu a jeho automatické obnovování. Najdete ho v sekci "Extensions" ve VS Code.

- **Git (volitelné)**  
    Pro snadné stažení projektu z repozitáře.

---

## 2. Instalace a Spuštění

Aplikace se skládá ze dvou částí (backend a frontend), které je potřeba spustit odděleně.

### Krok 1: Stažení a instalace závislostí

1. Otevřete terminál nebo příkazový řádek.
2. Naklonujte repozitář (pokud ho máte) nebo přejděte do složky s projektem.
3. V kořenové složce projektu spusťte příkaz pro instalaci všech potřebných balíčků:
     ```bash
     npm install
     ```

### Krok 2: Spuštění Backendu (Serveru)

V terminálu v kořenové složce projektu spusťte vývojový server:
```bash
npm run dev
```
Tím se spustí backendová část aplikace na adrese [http://localhost:3000](http://localhost:3000). Terminál nechte běžet po celou dobu práce s aplikací.

### Krok 3: Spuštění Frontendu (Uživatelského rozhraní)

1. Otevřete složku s projektem ve Visual Studio Code.
2. V průzkumníku souborů najděte soubor `src/frontend/index.html`.
3. Klikněte na něj pravým tlačítkem a zvolte **Open with Live Server**.
4. Tím se otevře nová karta ve vašem prohlížeči s běžící aplikací.

Po dokončení těchto kroků by měla být aplikace plně funkční.

---

## 3. Struktura Projektu

Popis klíčových složek a souborů v projektu:

```
/data/
    reservations.json    # Ukládá všechny vytvořené rezervace
    users.json           # Obsahuje seznam uživatelů a jejich zaheslovaná hesla

/src/
    /backend/
        server.ts          # Hlavní soubor serveru, API endpointy (přihlášení, registrace, správa rezervací)
    /config/
        config.ts          # Konfigurace aplikace (např. tajný klíč pro JWT tokeny)
    /frontend/
        index.html         # Struktura webové stránky
        style.css          # Vizuální styly
        script.js          # Logika frontendu (přihlašování, kalendář, rezervace)
    /middleware/
        authMiddleware.ts  # Middleware pro ověření JWT tokenu a oprávnění uživatele
    /utils/
        auth.ts            # Pomocné funkce pro práci s daty
        types.ts           # Definice datových struktur (User, Reservation)

/scripts/
    hashPassword.ts      # Pomocný skript pro manuální vytvoření hashe hesla

/.vscode/
    settings.json        # Nastavení pro VS Code (Live Server)

/package.json          # Definuje projekt, závislosti a skripty (např. npm run dev)
/tsconfig.json         # Konfigurace TypeScript kompilátoru
```

---

**Poznámka:**  
Pro detailnější informace o jednotlivých souborech a funkcionalitě doporučujeme procházet zdrojový kód a komentáře v projektu.


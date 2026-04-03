# Prompt pro generování custom SVG ikon — Chatař 2.0 / kdynachatu.cz

## Kontext aplikace

Webová aplikace pro správu rekreačních chat — rezervace pobytů, nákupní seznamy, galerie fotek, deníky, chatová komunikace mezi členy rodiny/přáteli. Estetika: **přírodní, chatařská, přátelská** — žádný korporátní look.

---

## Vizuální styl ikon

### Hlavní pravidla
- **Typ:** Outline/stroke ikony s občasným subtilním fillem (ne plně vyplněné, ne čistě lineární — něco mezi)
- **Stroke width:** 1.5–2px (konzistentní přes celou sadu)
- **Corner radius:** Jemně zaoblené konce tahů (`stroke-linecap: round`, `stroke-linejoin: round`)
- **Viewbox:** 24×24px (standardní, škálovatelné)
- **Grid:** Opticky centrované v 24×24 rámu s 2px padding (obsah v 20×20 zóně)
- **Detail level:** Středně detailní — ne příliš minimalistické (ne Lucide), ne příliš ilustrativní (ne plné ilustrace). Styl připomínající **Phosphor icons** nebo **Tabler icons** s nádechem ručního kreslení

### Barevná paleta (ikony jsou jednobarevné, ale navržené pro tyto barvy)
Ikony exportovat s `currentColor` (barva se dědí z CSS), ale designovat tak, aby vypadaly nejlépe v těchto earthy tónech:
- **Primární zelená:** `#3f7b63` (šalvějová)
- **Tmavá:** `#1a2721` (zeleno-šedá)
- **Neutrální:** `#6b7280` (stone gray)
- **Terracotta:** `#bf6c3d` (akcent)
- **Dřevěná hnědá:** `#7a5b42`

### Nálada & inspirace
- **Příroda:** Listy, dřevo, kouř z komína, horské siluety, stezky
- **Řemeslný charakter:** Mírně organické tahy (ne dokonale geometrické, ale stále čisté a čitelné)
- **Teplo & pohoda:** Ikony mají evokovat víkend na chatě, ne práci v kanceláři
- **Sezónnost:** Některé ikony mohou jemně odkazovat na venkovní prostředí (listy, slunce, hvězdy…)

### Technické požadavky
- Formát: `.svg`
- Kód: čistý, optimalizovaný SVG (žádné `<defs>`, `<style>`, `<clipPath>` pokud to není nutné)
- Bez rasterových vložek (žádné `<image>`)
- Barva: `stroke="currentColor"` / `fill="currentColor"` (nikdy hardcoded barva)
- Pojmenování souborů: `kebab-case.svg` (např. `calendar-check.svg`, `shopping-bag.svg`)
- Pixelově zarovnané tahy (vypadají ostře i na 1x displeji)

---

## Seznam ikon k vygenerování

### 1. Navigace (hlavní menu — 9 ikon)

| # | Název souboru | Popis | Nálada / detaily |
|---|--------------|-------|------------------|
| 1 | `nav-dashboard.svg` | Přehled/dashboard | Chata pohled zepředu s komínem, dým stoupající nahoru — jednoduchá silueta |
| 2 | `nav-reservations.svg` | Rezervace/kalendář | Kalendář s malým checkmarkem nebo kolíkem — evokuje zabraný termín |
| 3 | `nav-chat.svg` | Chat/poznámky | Dvě překrývající se bubliny — konverzace mezi chatařemi |
| 4 | `nav-shopping.svg` | Nákupní seznam | Nákupní taška nebo košík s listem/lístkem — ne korporátní cart |
| 5 | `nav-gallery.svg` | Galerie fotek | Dva překrývající se obrázky/polaroidy — fotky z výletu |
| 6 | `nav-diary.svg` | Deník/zápisník | Otevřená kniha nebo zápisník s tužkou — chatový deník |
| 7 | `nav-reconstruction.svg` | Rekonstrukce/údržba | Kladivo a klíč (nebo kladivo a hřebík) — práce na chatě |
| 8 | `nav-admin.svg` | Administrace | Ozubené kolečko nebo štít s klíčem — správa |
| 9 | `nav-settings.svg` | Nastavení chaty | Posuvníky/ekvalizér — konfigurace |

### 2. Akce (tlačítka, interakce — 15 ikon)

| # | Název souboru | Popis |
|---|--------------|-------|
| 10 | `action-plus.svg` | Přidat novou položku (+ v kruhu nebo samostatné) |
| 11 | `action-edit.svg` | Upravit (tužka nebo pero) |
| 12 | `action-delete.svg` | Smazat (koš nebo × v kruhu) |
| 13 | `action-close.svg` | Zavřít (×) |
| 14 | `action-check.svg` | Potvrdit/hotovo (fajfka ✓) |
| 15 | `action-search.svg` | Hledat (lupa) |
| 16 | `action-filter.svg` | Filtrovat (trychtýř nebo horizontální čáry) |
| 17 | `action-sort.svg` | Řadit (šipky nahoru-dolů) |
| 18 | `action-download.svg` | Stáhnout (šipka dolů do zásobníku) |
| 19 | `action-upload.svg` | Nahrát (šipka nahoru z zásobníku) |
| 20 | `action-share.svg` | Sdílet (větvení / tři body spojené čarami) |
| 21 | `action-copy.svg` | Kopírovat (dva překrývající se dokumenty) |
| 22 | `action-logout.svg` | Odhlásit se (dveře s šipkou ven) |
| 23 | `action-menu.svg` | Hamburger menu (tři horizontální čáry s lístkem/přírodním prvkem) |
| 24 | `action-back.svg` | Zpět (šipka doleva) |

### 3. Status & indikátory (11 ikon)

| # | Název souboru | Popis |
|---|--------------|-------|
| 25 | `status-warning.svg` | Varování (trojúhelník s vykřičníkem) |
| 26 | `status-error.svg` | Chyba (kruh s × nebo vykřičníkem) |
| 27 | `status-success.svg` | Úspěch (kruh s fajfkou) |
| 28 | `status-info.svg` | Informace (kruh s písmenem i) |
| 29 | `status-loading.svg` | Načítání (kruhový spinner / otáčení) |
| 30 | `status-empty.svg` | Prázdný stav (prázdná krabice nebo list) |
| 31 | `status-locked.svg` | Zamčeno (visací zámek) |
| 32 | `status-unlocked.svg` | Odemčeno (otevřený zámek) |
| 33 | `status-star.svg` | Oblíbené/důležité (hvězda) |
| 34 | `status-heart.svg` | Líbí se / hlasování (srdce) |
| 35 | `status-eye.svg` | Viditelné / sledující (oko) |

### 4. Doménově specifické — chata & příroda (16 ikon)

| # | Název souboru | Popis | Nálada |
|---|--------------|-------|--------|
| 36 | `cabin.svg` | Chata/dům | Útulná chata s komínem a střechou — hlavní symbol |
| 37 | `calendar.svg` | Kalendář (čistý, bez checkmarku) | Klasický kalendář s mřížkou |
| 38 | `calendar-check.svg` | Kalendář s potvrzením | Kalendář + fajfka = potvrzená rezervace |
| 39 | `calendar-plus.svg` | Kalendář s plus | Přidat datum/rezervaci |
| 40 | `key.svg` | Klíč | Starý/vintage klíč — přístup k chatě |
| 41 | `envelope.svg` | Obálka/email | Pozvánka nebo notifikace |
| 42 | `envelope-open.svg` | Otevřená obálka | Přečtená zpráva |
| 43 | `camera.svg` | Fotoaparát | Focení na výletě |
| 44 | `image.svg` | Obrázek/fotka | Rámeček s horami a sluncem (landscape) |
| 45 | `sun.svg` | Počasí — slunečno | Paprsky kolem kruhu |
| 46 | `cloud.svg` | Počasí — oblačno | Oblak |
| 47 | `rain.svg` | Počasí — déšť | Oblak s kapkami |
| 48 | `thermometer.svg` | Teplota | Teploměr se stupnicí |
| 49 | `tree.svg` | Strom/příroda | Jehličnatý strom (smrk) — okolí chaty |
| 50 | `campfire.svg` | Ohniště/táborák | Oheň na dřevech — večer u chaty |
| 51 | `mountain.svg` | Hory | Dvě horské špičky — poloha chaty |

### 5. UI utility (navigace, šipky, indikátory — 10 ikon)

| # | Název souboru | Popis |
|---|--------------|-------|
| 52 | `chevron-left.svg` | Šipka doleva (‹) |
| 53 | `chevron-right.svg` | Šipka doprava (›) |
| 54 | `chevron-down.svg` | Šipka dolů (dropdown) |
| 55 | `chevron-up.svg` | Šipka nahoru |
| 56 | `arrow-left.svg` | Plná šipka doleva |
| 57 | `arrow-right.svg` | Plná šipka doprava |
| 58 | `dots-vertical.svg` | Tři tečky svisle (kebab menu) |
| 59 | `dots-horizontal.svg` | Tři tečky vodorovně (more menu) |
| 60 | `grip.svg` | Drag handle (šest teček 2×3) |
| 61 | `external-link.svg` | Odkaz ven (šipka do rohu) |

### 6. Specifické pro funkce aplikace (9 ikon)

| # | Název souboru | Popis | Kontext |
|---|--------------|-------|---------|
| 62 | `inventory.svg` | Inventář/sklad | Krabice nebo police — co je na chatě |
| 63 | `checklist.svg` | Kontrolní seznam | Seznam s fajfkami — nákupní/úkolový |
| 64 | `note.svg` | Poznámka/vzkaz | Papírek s textem — měsíční poznámka |
| 65 | `users.svg` | Skupina uživatelů | Dvě-tři osoby — spoluchatali |
| 66 | `user.svg` | Jeden uživatel | Osoba/profil |
| 67 | `user-plus.svg` | Pozvat uživatele | Osoba s + |
| 68 | `shield.svg` | Bezpečnost/admin role | Štít — oprávnění |
| 69 | `help.svg` | Nápověda/otazník | Kruh s ? |
| 70 | `bell.svg` | Notifikace/upozornění | Zvonek |

---

## Soubory k dodání

```
icons/
├── nav/
│   ├── nav-dashboard.svg
│   ├── nav-reservations.svg
│   ├── nav-chat.svg
│   ├── nav-shopping.svg
│   ├── nav-gallery.svg
│   ├── nav-diary.svg
│   ├── nav-reconstruction.svg
│   ├── nav-admin.svg
│   └── nav-settings.svg
├── action/
│   ├── action-plus.svg
│   ├── action-edit.svg
│   ├── action-delete.svg
│   ├── action-close.svg
│   ├── action-check.svg
│   ├── action-search.svg
│   ├── action-filter.svg
│   ├── action-sort.svg
│   ├── action-download.svg
│   ├── action-upload.svg
│   ├── action-share.svg
│   ├── action-copy.svg
│   ├── action-logout.svg
│   ├── action-menu.svg
│   └── action-back.svg
├── status/
│   ├── status-warning.svg
│   ├── status-error.svg
│   ├── status-success.svg
│   ├── status-info.svg
│   ├── status-loading.svg
│   ├── status-empty.svg
│   ├── status-locked.svg
│   ├── status-unlocked.svg
│   ├── status-star.svg
│   ├── status-heart.svg
│   └── status-eye.svg
├── domain/
│   ├── cabin.svg
│   ├── calendar.svg
│   ├── calendar-check.svg
│   ├── calendar-plus.svg
│   ├── key.svg
│   ├── envelope.svg
│   ├── envelope-open.svg
│   ├── camera.svg
│   ├── image.svg
│   ├── sun.svg
│   ├── cloud.svg
│   ├── rain.svg
│   ├── thermometer.svg
│   ├── tree.svg
│   ├── campfire.svg
│   └── mountain.svg
├── ui/
│   ├── chevron-left.svg
│   ├── chevron-right.svg
│   ├── chevron-down.svg
│   ├── chevron-up.svg
│   ├── arrow-left.svg
│   ├── arrow-right.svg
│   ├── dots-vertical.svg
│   ├── dots-horizontal.svg
│   ├── grip.svg
│   └── external-link.svg
└── feature/
    ├── inventory.svg
    ├── checklist.svg
    ├── note.svg
    ├── users.svg
    ├── user.svg
    ├── user-plus.svg
    ├── shield.svg
    ├── help.svg
    └── bell.svg
```

---

## Referenční příklad SVG struktury

Každá ikona by měla vypadat přibližně takto:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="1.75"
     stroke-linecap="round" stroke-linejoin="round">
  <!-- obsah ikony -->
</svg>
```

---

## Celkem: 70 ikon

Styl: přírodní, chatařský, zaoblený outline s lehkým hand-drawn nádechem. Konzistentní stroke, 24×24 viewbox, `currentColor` pro snadné barvení přes CSS.

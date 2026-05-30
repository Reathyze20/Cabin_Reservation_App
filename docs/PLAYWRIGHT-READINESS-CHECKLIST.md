Verified: 2026-05-30
Scope: Playwright readiness checklist for frontend-v2 + local backend with external automation workspace

# Playwright Readiness Checklist

Pokud hledate dokument pro cloveka, ktery se s Playwrightem teprve seznamuje a potrebuje se nejdriv zorientovat v aplikaci, zacnete v [docs/PLAYWRIGHT-STARTER-GUIDE.md](docs/PLAYWRIGHT-STARTER-GUIDE.md).

Prakticky checklist pro pripravu aplikace na automatizovane browser testy v Playwrightu.

Rozhodnuti pro tenhle projekt:

- automaty nepatri do aplikace ani do tohoto repa,
- Playwright projekt, testy, fixtures a runner maji byt mimo aplikaci,
- aplikace ma byt pouze pripravena na to, aby se nad ni daly spolehlive psat externi automaty.

Cil:

- aby se na tom dalo zacit ucit bez zbytecneho DevOps chaosu,
- aby nove automaty sly psat i bez detailni znalosti celeho backendu,
- aby testy byly opakovatelne a nezavisle na realnem SMTP, produkci nebo manualnim cisteni DB.

Tento dokument je zamerne psany pro vas konkretni repo, ne jako obecny Playwright tutorial.

---

## Aktualni stav repa

Co uz mate:

- `frontend-v2/` je React 19 + Vite 7 + TypeScript strict.
- frontend lokalne bezi pres Vite a proxyuje `/api` a `/uploads` na backend `http://localhost:3000`.
- root `npm run dev` umi zvednout backend i frontend najednou.
- Vitest uz v repu je a frontend testy existuji.
- existuje realisticky manualni flow v [docs/SPRINT-0-SMOKE-TEST.md](docs/SPRINT-0-SMOKE-TEST.md).
- UI uz na mnoha mistech pouziva slusne `aria-label`, takze cast selektoru pujde psat bez `data-testid`.
- lokalni vyvoj umi obejit produkcni e-mail zavislost pres invite link flow a dev verify token fallback.
- hlavni route rooty, shell navigace, admin plochy, settings, sdilene panely a nejdulezitejsi sekundarni modaly uz maji stabilni selector kontrakt.
- opakovane entity uvnitr shoppingu, pantry, poznamek, rezervaci a rekonstrukce uz maji vlastni stabilni item-level anchor.

Co dnes chybi:

- chybi samostatny automation workspace nebo repo mimo aplikaci,
- chybi domluveny kontrakt mezi aplikaci a externim automation projektem,
- neexistuje izolovany e2e seed/reset tok pro DB,
- v produkcnim UI je aktualni audit scope pokryty: auth, shell, verejne routy, hlavni feature flow, admin/settings, sdilene overlaye i opakovane entity; zbyvaji uz jen pripadne preview leaf widgety jako quality-of-life doplnek,
- neexistuji helpery pro prihlaseni roli `admin/user/guest` nebo pro pripravu `storageState`,
- neni oddelena sada "dobrych prvnich flow" pro nekoho, kdo se Playwright teprve uci.

Co je zamerne mimo scope tohoto repa:

- `@playwright/test` v `frontend-v2/package.json`,
- `playwright.config.ts` uvnitr aplikace,
- `e2e/` testy, fixtures a helpery uvnitr aplikace,
- CI joby pro browser automaty v tomto repu.

---

## Faze 0 - Co bude potreba, aby s tim mohla vubec zacit

### 0.1 Externi Playwright vrstva mimo aplikaci

- [ ] Vytvorit samostatny automation workspace nebo repo mimo tuto aplikaci.
- [ ] Tam pridat `@playwright/test`.
- [ ] Tam vygenerovat browsery pres `npx playwright install`.
- [ ] Tam vytvorit `playwright.config.ts`.
- [ ] Tam pridat skripty:
  - [ ] `test:e2e`
  - [ ] `test:e2e:ui`
  - [ ] `test:e2e:headed`
  - [ ] `test:e2e:debug`
  - [ ] `test:e2e:codegen`
- [ ] Tam vytvorit slozky:
  - [ ] `e2e/tests`
  - [ ] `e2e/fixtures`
  - [ ] `e2e/helpers`
- [ ] V aplikaci ponechat jen stabilni selektory, pristupnost a predvidatelne UI stavy.
- [ ] Nepridavat do tohoto repa Playwright dependency, config ani specs.

Definition of done:

- [ ] Externi automation workspace umi spustit prazdny nebo demo smoke test.
- [ ] Externi automation workspace umi otevrit Playwright UI mode.
- [ ] Externi automation workspace umi pouzit codegen.
- [ ] Tento repo zustane bez Playwright runneru a bez `e2e/` slozky.

### 0.2 Jednoduchy lokalni start bez magie

- [ ] Domluvit jeden oficialni lokalni start pro E2E:
  - [ ] DB: `docker compose up -d db`
  - [ ] app: `npm run dev`
- [ ] V externim Playwright configu nastavit `baseURL` na frontend Vite server.
- [ ] V externim Playwright configu rozhodnout, jestli bude pouzity `webServer`, nebo jestli se appka bude spoustet rucne.
- [ ] Domluvit, jestli automation workspace bude startovat aplikaci sam, nebo se pripoji na uz bezici lokalni prostredi.

Doporuceni pro tohle repo:

- pro browser testy drzet frontend na Vite portu a backend na `3000`,
- jako `baseURL` pouzit frontend, ne backend,
- neucit zacatecnika spoustet tri ruzne terminaly rucne, pokud to nemusi,
- aplikaci spoustet z tohoto repa, ale automaty poustet z externiho workspace.

Definition of done:

- [ ] Je jasne, jak startuje appka a jak startuje externi runner.
- [ ] Existuje jedno jednoduche README pro externi automation workspace.

---

## Faze 1 - Stabilni testovaci data

Tohle je nejdulezitejsi cast. Bez ni se zacatecnik nauci hlavne to, ze automatizace je nespolehliva.

Poznamka:

- data a reset logika muzou vzniknout v tomhle backend repu,
- samotne testy a Playwright helpery ale maji zustat mimo aplikaci.

### 1.1 Izolovana databaze pro E2E

- [ ] Zalozit vyhrazenou E2E DB nebo aspon vyhrazeny `DATABASE_URL` pro testy.
- [ ] Nespoustet Playwright proti bezne dev DB, kterou si nekdo rucne prepisuje.
- [ ] Pridat reset strategii pred behem testu.
- [ ] Pridat seed strategii s minimalnimi daty.

Minimalni seed by mel umet pripravit:

- [ ] jednu chatu,
- [ ] admina,
- [ ] bezneho clena,
- [ ] guesta,
- [ ] volitelnou jednu rezervaci,
- [ ] volitelny shopping list,
- [ ] volitelne prazdne album a denik.

Definition of done:

- [ ] Test bezi opakovane nad stejnym startovnim stavem.
- [ ] Po failu neni potreba rucne cistit DB.

### 1.2 Nepouzivat realne e-maily jako blocker

- [ ] Pro E2E nepodminovat zakladni flow realnym SMTP.
- [ ] U invite flow pouzit API helper nebo kopirovany invite link.
- [ ] U verify flow pouzit lokalni dev fallback (`testToken`) nebo predpripraveny overeny seed user.
- [ ] Do prvnich Playwright flow vubec nezatahovat produkcni SES/SMTP.

Tohle je pro vas dulezite, protoze manualni family-ready docs uz dnes potvrzuji, ze produkcni SMTP je samostatny operational problem, ne dobry zaklad pro ucebni E2E vrstvu.

Definition of done:

- [ ] Prvni automaty necekaji na inbox ani na external provider.

---

## Faze 2 - Udelat UI testovatelne

### 2.1 Preferovat pristupne selektory

- [ ] Primarne psat Playwright selektory pres `getByRole`, `getByLabel`, `getByText` tam, kde je text stabilni.
- [ ] Vyuzit toho, ze cast UI uz ma `aria-label`.
- [ ] Nezavisle na textu testovat URL, nadpis, toast, pocet polozek nebo viditelnost sekce.

Co uz dnes pomaha:

- auth formulare maji cast stabilnich labelu,
- modaly a spousta akci v galerii, shoppingu, notes a reservations maji `aria-label`,
- admin ma smysluplne sekce a tablisty.

### 2.2 Pridat `data-testid` jen tam, kde je to opravdu potreba

Neni cil obalit celou appku test IDcky. Cilem je pridat je jen na mista, kde je text dynamicky, opakovany nebo moc krehky.

Priorita pro toto repo:

- [x] login submit button
- [x] register submit button
- [x] invite create form
- [x] invite row item
- [x] reservations create CTA
- [x] reservation detail action buttons
- [x] shopping create list CTA
- [x] shopping add item input/button
- [x] notes message input/send
- [x] gallery upload trigger
- [x] diary create entry CTA
- [x] profile drawer root
- [x] route/page rooty pro public a protected obrazovky
- [x] desktop a mobile navigace s `data-route`
- [x] opakovane entity s `data-list-id`, `data-thread-id`, `data-folder-id`, `data-photo-id`, `data-date`, `data-invite-id`, `data-user-id`
- [x] admin member management, create-user flow a cabin settings
- [x] sdilene modal/dialog kontrakty a system/log panely
- [x] sekundarni modaly a lightboxy pro galerii, denik, availability a rekonstrukci

Pravidlo:

- [ ] `data-testid` davat na semanticky dulezite blocky a akce, ne na kazdy `div`.
- [ ] Jmena drzet vecna a stabilni, ne vizualni.

Priklady dobrych jmen:

- `invite-create-submit`
- `reservation-create-button`
- `shopping-list-create-button`
- `notes-send-button`

Priklady spatnych jmen:

- `green-button`
- `top-card`
- `modal-left`

Definition of done:

- [ ] Zacatecnik umi najit element bez dlouhych CSS selektoru a bez `nth(3)` hacku.

### 2.4 Selector best practice pro tohle repo

Tohle je presne cast, ktera do aplikace patri. `data-testid` jsou pasivni kontrakt pro externi testy, ne automatizace uvnitr aplikace.

Pouzivejte toto poradi:

1. `getByRole()` kdyz ma UI stabilni semantiku a pristupny nazev.
2. `getByLabel()` pro formulare, pokud label zustava stabilni.
3. `getByText()` jen tam, kde je text opravdu stabilni a neni lokalizacne krehky.
4. `getByTestId()` pro page rooty, shell, dynamicke CTA, opakovane polozky a mista, kde je text/promenne hodnoty krehke.

Pravidla naming konvence:

- `*-page` pro route root.
- `*-form`, `*-input`, `*-button`, `*-card`, `*-section`, `*-link`, `*-widget` pro hlavni uzly.
- opakovane záznamy maji stejny `data-testid` a navic stabilni `data-*` identifikator.
- nepouzivat vizualni jmena jako `green-button`, `left-card`, `top-row`.
- nepokryvat `data-testid` kazdy `div`; chytre minimum je lepsi nez test-id spam.

---

## Aktualni selector inventory

Nasledujici seznam odpovida aktualnimu kodu ve `frontend-v2/` po selector auditu dne 2026-05-30.

### Shell a navigace

- `app-shell`
- `app-shell-main`
- `desktop-topbar`
- `desktop-home-link`
- `desktop-primary-nav`
- `desktop-nav-link` + `data-route`
- `profile-menu-button`
- `profile-menu`
- `profile-menu-profile-button`
- `profile-menu-superadmin-link`
- `profile-menu-admin-link`
- `profile-menu-invites-link`
- `profile-menu-diagnostics-link`
- `profile-menu-logout-button`
- `mobile-header`
- `mobile-header-home-link`
- `mobile-profile-menu-button`
- `mobile-nav`
- `mobile-nav-link` + `data-route`
- `profile-drawer-overlay`
- `profile-drawer`
- `profile-drawer-close-button`
- `profile-tab-personal-button`
- `profile-tab-security-button`
- `profile-tab-personal`
- `profile-email-input`
- `profile-change-email-button`
- `profile-tab-security`
- `profile-security-form`
- `profile-old-password-input`
- `profile-new-password-input`
- `profile-new-password-confirm-input`
- `profile-change-password-button`
- `profile-leave-cabin-button`

### Sdilene overlaye a pomocne UI

- `modal-overlay`
- `modal-card`
- `modal-title`
- `modal-close-button`
- `modal-body`
- `modal-footer`
- `confirm-dialog-message`
- `confirm-dialog-error`
- `confirm-dialog-cancel-button`
- `confirm-dialog-confirm-button`
- `offline-banner`
- `cookie-consent-banner`
- `cookie-consent-detail`
- `cookie-consent-detail-toggle`
- `cookie-consent-privacy-link`
- `cookie-consent-accept-button`
- `toast` + `data-toast-type` + `data-toast-visible`

### Public a auth flow

- `auth-page` + `data-auth-view`
- `login-form-view`
- `login-form`
- `login-username-input`
- `login-password-input`
- `login-remember-checkbox`
- `login-submit-button`
- `login-forgot-password-link`
- `login-error-message`
- `login-show-register-link`
- `register-email-sent-screen`
- `register-back-to-login-link`
- `register-form-view`
- `register-form`
- `register-cabin-name-input`
- `register-weather-location-input`
- `register-username-input`
- `register-email-input`
- `register-password-input`
- `register-color-swatches`
- `register-color-swatch-<hex>`
- `register-submit-button`
- `register-message`
- `register-show-login-link`
- `forgot-password-form-view`
- `forgot-password-form`
- `forgot-password-identifier-input`
- `forgot-password-submit-button`
- `forgot-password-message`
- `forgot-password-back-link`
- `verify-form-view`
- `verify-form`
- `verify-code-input`
- `verify-submit-button`
- `verify-message`
- `verify-back-to-login-link`
- `reset-password-page` + `data-reset-state`
- `reset-password-card`
- `reset-password-form`
- `reset-password-input`
- `reset-password-confirm-input`
- `reset-password-message`
- `reset-password-submit-button`
- `reset-password-login-link`
- `verify-email-page` + `data-verify-state`
- `verify-email-login-link`
- `landing-nav`
- `landing-home-link`
- `landing-login-button`
- `landing-trial-button`
- `landing-mobile-menu-button`
- `landing-mobile-menu`
- `landing-mobile-login-button`
- `landing-mobile-trial-button`
- `landing-hero-section`
- `landing-hero-primary-cta`
- `landing-hero-secondary-cta`
- `invite-page` + `data-invite-step`
- `invite-invalid-card`
- `invite-invalid-login-button`
- `invite-welcome-card`
- `invite-continue-button`
- `invite-existing-login-link`
- `invite-register-card`
- `invite-back-button`
- `invite-register-error`
- `invite-register-form`
- `invite-username-input`
- `invite-password-input`
- `invite-email-input`
- `invite-submit-button`
- `onboarding-page` + `data-onboarding-state`
- `onboarding-form`
- `onboarding-cabin-name-input`
- `onboarding-error-message`
- `onboarding-submit-button`
- `onboarding-retry-button`
- `onboarding-logout-button`
- `privacy-page`
- `privacy-back-link`
- `terms-page`
- `terms-back-link`
- `not-found-page`
- `not-found-home-button`

### Dashboard a rezervace

- `dashboard-page`
- `dashboard-winter-banner`
- `dashboard-grid`
- `dashboard-reservation-widget`
- `dashboard-weather-widget`
- `dashboard-shopping-widget`
- `dashboard-handover-widget`
- `dashboard-reconstruction-widget`
- `dashboard-activation-widget`
- `reservations-page` + `data-reservations-state`
- `reservations-sidebar`
- `reservation-create-button`
- `reservation-list-item` + `data-reservation-id` + `data-reservation-status`
- `reservation-detail-card`
- `reservation-back-button`
- `reservation-delete-button`
- `reservation-watch-button`
- `reservation-assign-button`
- `reservation-edit-button`

### Shopping, notes, galerie, denik, rekonstrukce

- `shopping-page`
- `shopping-list-master`
- `shopping-list-row` + `data-list-id`
- `shopping-list-create-button`
- `shopping-list-detail`
- `shopping-detail-back-button`
- `shopping-add-item-form`
- `shopping-add-item-input`
- `shopping-add-item-button`
- `shopping-item-row` + `data-item-id` + `data-status` + `data-essential`
- `shopping-item-from-home-button`
- `shopping-item-essential-button`
- `shopping-item-delete-button`
- `inventory-item-row` + `data-item-id` + `data-item-status`
- `inventory-item-add-to-cart-button`
- `inventory-item-edit-button`
- `inventory-item-delete-button`
- `notes-page`
- `notes-thread-sidebar`
- `notes-thread-search-input`
- `notes-thread-list`
- `notes-thread-item` + `data-thread-id`
- `notes-create-thread-button`
- `notes-message-bubble` + `data-note-id` + `data-message-owner`
- `notes-message-actions-button`
- `notes-message-input`
- `notes-handover-toggle-button`
- `notes-message-form`
- `notes-message-textarea`
- `notes-send-button`
- `gallery-page`
- `gallery-folder-search-input`
- `gallery-folder-sort-select`
- `gallery-create-folder-button`
- `gallery-create-folder-card`
- `gallery-folder-card` + `data-folder-id`
- `gallery-back-to-folders-button`
- `gallery-upload-button`
- `gallery-upload-form`
- `gallery-upload-dropzone`
- `gallery-upload-file-input`
- `gallery-upload-previews`
- `gallery-upload-preview-item` + `data-file-index`
- `gallery-upload-remove-file-button`
- `gallery-upload-add-more-button`
- `gallery-upload-progress`
- `gallery-upload-submit-button`
- `gallery-upload-error`
- `gallery-photo-grid`
- `gallery-empty-upload-button`
- `gallery-photo-card` + `data-photo-id`
- `gallery-lightbox` + `data-photo-id`
- `gallery-lightbox-toolbar`
- `gallery-lightbox-download-button`
- `gallery-lightbox-delete-button`
- `gallery-lightbox-close-button`
- `gallery-lightbox-image-wrapper`
- `gallery-lightbox-image`
- `gallery-lightbox-prev-button`
- `gallery-lightbox-next-button`
- `gallery-lightbox-caption`
- `gallery-lightbox-description`
- `gallery-lightbox-description-input`
- `gallery-lightbox-description-save-button`
- `gallery-lightbox-description-error`
- `diary-page`
- `diary-folders-view`
- `diary-new-folder-button`
- `diary-folder-card` + `data-folder-id`
- `diary-calendar-wrapper`
- `diary-calendar`
- `diary-day-card` + `data-date`
- `diary-gallery-picker-selected-count`
- `diary-gallery-picker-confirm-button`
- `diary-gallery-picker-back-button`
- `diary-gallery-picker-folders`
- `diary-gallery-picker-folder-card` + `data-folder-id`
- `diary-gallery-picker-photos`
- `diary-gallery-picker-photo-card` + `data-photo-id`
- `diary-lightbox` + `data-photo-id`
- `diary-lightbox-close-button`
- `diary-lightbox-prev-button`
- `diary-lightbox-next-button`
- `diary-lightbox-image`
- `diary-lightbox-caption`
- `diary-lightbox-download-button`
- `diary-attach-photos-button`
- `diary-delete-entry-button`
- `diary-save-entry-button`
- `diary-entry-textarea`
- `availability-form`
- `availability-from-input`
- `availability-to-input`
- `availability-submit-button`
- `availability-cancel-edit-button`
- `availability-submit-error`
- `availability-list-section`
- `availability-list`
- `availability-item` + `data-availability-id`
- `availability-edit-button`
- `availability-delete-button`
- `availability-delete-error`
- `reconstruction-page` + `data-reconstruction-state`
- `reconstruction-summary`
- `reconstruction-board`
- `reconstruction-item-card` + `data-item-id` + `data-item-category`
- `reconstruction-item-edit-button`
- `reconstruction-item-delete-button`
- `reconstruction-item-vote-button`
- `reconstruction-item-status-select`
- `reconstruction-item-toggle-done`
- `reconstruction-item-form`
- `reconstruction-category-tabs`
- `reconstruction-category-tab` + `data-category`
- `reconstruction-title-input`
- `reconstruction-description-input`
- `reconstruction-idea-link-input`
- `reconstruction-idea-thumbnail-input`
- `reconstruction-idea-cost-input`
- `reconstruction-company-phone-input`
- `reconstruction-company-email-input`
- `reconstruction-company-link-input`
- `reconstruction-company-status-select`
- `reconstruction-task-deadline-input`
- `reconstruction-task-cost-input`
- `reconstruction-cancel-button`
- `reconstruction-submit-button`
- `reconstruction-form-error`

### Admin, settings a backoffice

- `admin-page` + `data-admin-state`
- `admin-add-user-button`
- `admin-open-diagnostics-button`
- `admin-section-menu`
- `admin-section-link` + `data-section-key` + `data-route`
- `admin-users-section`
- `admin-user-search-input`
- `admin-role-filters`
- `admin-role-filter-button` + `data-role-filter`
- `admin-users-list`
- `admin-user-card` + `data-user-id`
- `admin-edit-user-button`
- `edit-user-username-input`
- `edit-user-role-select`
- `edit-user-password-input`
- `edit-user-save-error`
- `edit-user-save-button`
- `edit-user-remove-from-cabin-button`
- `edit-user-delete-reservations-button`
- `edit-user-delete-user-button`
- `admin-create-user-section`
- `admin-create-user-form`
- `admin-create-username-input`
- `admin-create-password-input`
- `admin-create-role-select`
- `admin-create-submit-button`
- `admin-create-user-error`
- `admin-invites-section`
- `admin-invite-guidance-section`
- `invite-create-form`
- `invite-role-select`
- `invite-days-input`
- `invite-max-uses-input`
- `invite-create-submit`
- `invite-active-list`
- `invite-card` + `data-invite-id`
- `invite-copy-message-button`
- `invite-email-button`
- `invite-revoke-button`
- `admin-system-stats-section`
- `admin-invite-system-stats-section`
- `admin-cabin-settings-section`
- `cabin-settings-page`
- `cabin-settings-panel` + `data-cabin-settings-state`
- `cabin-settings-back-button`
- `cabin-settings-save-button`
- `cabin-settings-save-error`
- `cabin-settings-tab-nav`
- `cabin-settings-tab-button` + `data-tab-id`
- `cabin-settings-form`
- `cabin-settings-basic-tab`
- `cabin-settings-operations-tab`
- `cabin-settings-modules-tab`
- `cabin-settings-name-input`
- `cabin-settings-description-input`
- `cabin-settings-weather-location-input`
- `cabin-settings-welcome-message-input`
- `cabin-settings-rules-input`
- `cabin-settings-winterized-toggle`
- `cabin-settings-checklist`
- `cabin-settings-checklist-list`
- `cabin-settings-checklist-item`
- `cabin-settings-checklist-input`
- `cabin-settings-checklist-remove-button`
- `cabin-settings-checklist-add-button`
- `cabin-settings-feature-toggles`
- `cabin-settings-feature-toggle-row` + `data-feature`
- `cabin-settings-feature-toggle`
- `admin-diagnostics-page`
- `admin-diagnostics-hero`
- `admin-diagnostics-guide`
- `admin-diagnostics-system-info`
- `system-stats-panel` + `data-system-stats-state`
- `system-stat-card` + `data-stat-tone`
- `logs-panel` + `data-logs-scope` + `data-logs-state`
- `logs-toolbar`
- `logs-date-select`
- `logs-level-select`
- `logs-source-select`
- `logs-lines-select`
- `logs-request-id-input`
- `logs-user-id-input`
- `logs-module-input`
- `logs-path-input`
- `logs-status-input`
- `logs-search-input`
- `logs-reset-filters-button`
- `logs-refresh-button`
- `logs-summary`
- `logs-list`
- `log-entry` + `data-log-index`
- `superadmin-page` + `data-superadmin-state`
- `superadmin-create-user-jump-button`
- `superadmin-logs-jump-button`
- `superadmin-users-section`
- `superadmin-user-search-input`
- `superadmin-role-filters`
- `superadmin-status-filters`
- `superadmin-user-card` + `data-user-id`
- `superadmin-toggle-ban-button`
- `superadmin-create-user-section`
- `superadmin-create-user-form`
- `superadmin-create-username-input`
- `superadmin-create-email-input`
- `superadmin-create-role-select`
- `superadmin-create-submit-button`

### Jak to psat v Playwrightu

Nasledujici priklady patri do externiho automation projektu, ne do teto aplikace.

Preferovane priklady:

- `page.getByTestId('app-shell')`
- `page.getByTestId('desktop-nav-link').filter({ has: page.locator('[data-route="/shopping"]') })`
- `page.getByTestId('invite-card').locator('[data-invite-id="..."]')`
- `page.getByTestId('shopping-list-row').locator('[data-list-id="..."]')`
- `page.getByTestId('notes-thread-item').locator('[data-thread-id="..."]')`
- `page.getByTestId('gallery-folder-card').locator('[data-folder-id="..."]')`
- `page.locator('[data-testid="diary-day-card"][data-date="2026-06-12"]')`

Anti-patterny:

- dlouhe CSS selektory pres tridy layoutu,
- `nth()` jako hlavni strategie vyberu,
- selektory navazane na vizualni text, kdyz uz existuje stabilni `data-testid`,
- testy zavisle na tom, ze se dropdown nebo modal otevre po pevnem timeoutu.

### 2.3 Omezit flaky body v UI

- [ ] Nedelat testy zavisle na animacich nebo nahodnych timeout delay.
- [ ] Kde je to potreba, cekat na konkretni sitovy efekt nebo konkretni UI stav.
- [ ] Mit konzistentni loading a disabled stavy na tlacitkach po submitu.
- [ ] U uploadu a mutaci vracet citelny uspesny nebo chybovy stav.

Definition of done:

- [ ] Testy neobsahuji `waitForTimeout()` jako hlavni synchronizacni strategii.

---

## Faze 3 - Helpery, aby nemusela vse klikat rucne

Tohle je cast, ktera zkratce dela rozdil mezi "zkousi recorder" a "umi si napsat vlastni test".

### 3.1 Auth helpery

- [ ] Pridat helper pro login admina pres UI.
- [ ] Pridat helper pro login pres API a ulozeni `storageState`.
- [ ] Pridat oddelene `storageState` pro `admin`, `member`, `guest`.

Doporuceni:

- prvni 1-2 testy klidne nechat pres UI login, at vidi cely flow,
- od dalsich testu uz prepnout na API login nebo `storageState`, at testy nejsou pomale a krehke.

### 3.2 Data helpery

- [ ] Helper `createInvite()`.
- [ ] Helper `createReservation()`.
- [ ] Helper `createShoppingList()`.
- [ ] Helper `createDiaryFolder()`.
- [ ] Helper `cleanupCabinData()` nebo reset DB.

Definition of done:

- [ ] Novy test umi byt kratsi a cte se jako scenar, ne jako 80 radku setupu.

---

## Faze 4 - Vybrat prvni automaty pro uceni

Nezacinat uploadem, offline modem ani websocket realtime. Zacit na flow, kde je vysoka sance na rychly uspech.

### Doporucene prvni 4 scenare

- [ ] Login admina a stabilni dashboard shell.
- [ ] Admin vytvori invite a clen prijme invite link.
- [ ] Clen vytvori shopping list a prida polozku.
- [ ] Clen vytvori rezervaci a admin ji vidi.

Proc prave tyto:

- mapuji se na uz existujici manualni smoke flow,
- maji jasny business smysl,
- netlaci hned na nejtezsi technicke rohy,
- ukazi praci s formularem, navigaci, dvema rolemi i persistenci dat.

### Co nechat az na druhou vlnu

- [ ] galerie upload,
- [ ] diary s navazanymi fotkami,
- [ ] mobile viewport matrix,
- [ ] offline/PWA chovani,
- [ ] realtime a notifikace,
- [ ] tracing flaky edge cases.

---

## Faze 5 - Vylozene priprava pro ni jako pro zacatecnika

Pokud ma mit sanci tvorit testy sama, potrebuje mit hotove tyto veci:

- [ ] kratky README "Jak spustit Playwright v tomhle repu".
- [ ] priklad 1 jednoducheho testu.
- [ ] priklad 1 testu s dvema rolemi.
- [ ] priklad 1 testu s file upload fixture.
- [ ] seznam doporucenych selektoru a anti-patternu.
- [ ] ukazku prace s Playwright UI mode a trace viewerem.

Minimalni obsah README:

- [ ] jak zvednout DB,
- [ ] jak spustit appku,
- [ ] jak pustit Playwright UI,
- [ ] jak pustit jeden konkretni test,
- [ ] kam se ukladaji screenshoty, videa a traces,
- [ ] co delat, kdyz test failne.

---

## Faze 6 - CI az potom

Dokud neni stabilni lokalni beh, nema smysl to hnát do CI.

### Co staci pro prvni CI vlnu

- [ ] Chromium only.
- [ ] 2-4 stabilni smoke scenare.
- [ ] trace on failure.
- [ ] screenshot on failure.
- [ ] HTML report jako artifact.

### Co neni potreba hned

- [ ] vsechny browsery,
- [ ] plny mobile matrix,
- [ ] paralelni beh vseho,
- [ ] desitky scenaru,
- [ ] coverage vanity metriky.

Definition of done:

- [ ] CI chyti nejdulezitejsi browser regresi, ale neni otravne krehka.

---

## Konkretni priprava pro vase repo

Tohle je realisticky prvni implementacni balik, pokud to budete chtit opravdu zavest:

### Balik A - minimum pro start

- [ ] pridat Playwright dependency a config,
- [ ] pridat `test:e2e*` skripty,
- [ ] pridat jeden smoke test `login -> dashboard`,
- [ ] pridat README pro spousteni,
- [ ] zafixovat 5-10 nejdulezitejsich selector anchoru.

### Balik B - aby se v tom dalo samostatne ucit

- [ ] pridat seed/reset strategii,
- [ ] pridat role helpery,
- [ ] pridat 3-4 realne scenare podle [docs/SPRINT-0-SMOKE-TEST.md](docs/SPRINT-0-SMOKE-TEST.md),
- [ ] oddelit test fixture data od realne dev DB.

### Balik C - aby to zacalo hlidat regresi

- [ ] pustit Chromium smoke v CI,
- [ ] brat trace a screenshot pri failu,
- [ ] zapsat workflow pro debug flaky testu.

---

## Co bych doporucil udelat ted hned

Pokud je cil, aby si mohla co nejdriv sama zkouset Playwright, nejlepsi poradi je:

1. Zavedeme Playwright do `frontend-v2`.
2. Pridame 1-2 nejdulezitejsi `data-testid` anchor body.
3. Udelame jeden opravdu jednoduchy smoke test `login -> dashboard`.
4. Udelame jeden druhy test `admin invite -> member accept`.
5. Teprve pak pridame seed/helpery a dalsi scenare.

To je schvalne nizky technicky strop a vysoky pomer "rychly uspech / mala frustrace".

---

## Shrnuti rozhodnuti

Pokud to ma byt priprava pro nekoho, kdo se automation teprve uci, budete potrebovat hlavne toto:

- [ ] Playwright infrastrukturu v repu,
- [ ] izolovana a resetovatelna data,
- [ ] par stabilnich selectoru,
- [ ] 2-4 jednoduche realisticke flow,
- [ ] kratkou lokalni dokumentaci,
- [ ] neblokovat zacatek na SMTP, offline nebo mobilnich edge casich.

Bez techto sesti veci se bude ucit hlavne boj s prostredim.
Se spravne pripravenym minimem se bude ucit skutecny Playwright.
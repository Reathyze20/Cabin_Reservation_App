/* ============================================================================
   pages/cabin-settings.ts — Cabin configuration page (admin only)
   Allows admin to configure name, description, location, departure checklist,
   welcome message, rules, features, and more.
   ============================================================================ */

import { authFetch, showToast, isAdmin, getCabinId, setCabinFeatures, setCabinWinterized, validateWeatherLocation, validateForm } from '../lib/common';
import { navigate, refreshNav } from '../lib/router';
import type { PageModule } from '../lib/router';

// ── Types ─────────────────────────────────────────────────────────────

interface CabinSettings {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  welcomeMessage: string | null;
  weatherLocation: string | null;
  rules: string | null;
  departureChecklist: string[] | null;
  coverPhotoUrl: string | null;
  isWinterized: boolean;
  features: Record<string, boolean> | null;
}

// ── Module constants ──────────────────────────────────────────────────

const DEFAULT_CHECKLIST = [
  'Vypnuto a vypuštěno topení/voda',
  'Zavřené okenice',
  'Vybraný popel z kamen',
  'Vyprázdněná lednice',
  'Zamčeno',
];

const AVAILABLE_FEATURES: { key: string; label: string; description: string }[] = [
  { key: 'reservations', label: 'Rezervace', description: 'Kalendář rezervací chaty' },
  { key: 'shopping', label: 'Nákupy', description: 'Nákupní seznamy a zásoby' },
  { key: 'notes', label: 'Chat', description: 'Nástěnka a vlákna zpráv' },
  { key: 'gallery', label: 'Galerie', description: 'Fotoalbum a vzpomínky' },
  { key: 'diary', label: 'Deník', description: 'Deník pobytů' },
  { key: 'reconstruction', label: 'Rekonstrukce', description: 'Kanban board — nápady, firmy, úkoly' },
  { key: 'inventory', label: 'Zásoby', description: 'Správa zásob na chatě' },
];

// ── State ─────────────────────────────────────────────────────────────

let abortController: AbortController | null = null;
let settings: CabinSettings | null = null;

// ── Template ──────────────────────────────────────────────────────────

function getTemplate(): string {
  return `
  <div class="cabin-settings-page">
    <div class="cabin-settings-header">
      <div class="cabin-settings-header-left">
        <button class="cabin-settings-back" id="cs-back" title="Zpět na přehled">←</button>
        <div>
          <h1 class="cabin-settings-title">Nastavení chaty</h1>
          <p class="cabin-settings-subtitle">Přizpůsobte si svou chatu podle sebe</p>
        </div>
      </div>
    </div>

    <div id="cs-content" class="cabin-settings-content">
      <div class="cabin-settings-loading">
        <div class="spinner"></div>
        <p>Načítám nastavení…</p>
      </div>
    </div>
  </div>`;
}

function renderSettings(): void {
  const content = document.getElementById('cs-content');
  if (!content || !settings) return;

  const checklist = settings.departureChecklist || DEFAULT_CHECKLIST;
  const features = settings.features || {};

  content.innerHTML = `
  <form id="cs-form" class="cabin-settings-form" novalidate>

    <div class="cs-tabs">
      <button type="button" class="cs-tab active" data-target="tab-basic">Základní</button>
      <button type="button" class="cs-tab" data-target="tab-operations">Provoz a údržba</button>
      <button type="button" class="cs-tab" data-target="tab-modules">Moduly</button>
    </div>

    <!-- TAB 1: ZÁKLADNÍ -->
    <div class="cs-tab-pane active" id="tab-basic">
      <!-- ─── Section: Základní informace ────────────────────────────── -->
      <section class="cs-section">
        <div class="cs-section-header">
          <h2>🏠 Základní informace</h2>
          <p>Jak se vaše chata jmenuje a kde se nachází</p>
        </div>

        <div class="cs-field">
          <label for="cs-name">Název chaty</label>
          <input type="text" id="cs-name" maxlength="100" value="${escapeAttr(settings.name)}"
                 placeholder="např. Chalupa pod Kletí" required />
          <span class="cs-hint">Zobrazuje se v navigaci a pozvánkách</span>
        </div>

        <div class="cs-field">
          <label for="cs-description">Popis <span class="cs-optional">(nepovinné)</span></label>
          <textarea id="cs-description" maxlength="2000" rows="3"
                    placeholder="Útulná chaloupka v podhůří Kleti s krásným výhledem…">${escapeHtml(settings.description || '')}</textarea>
          <span class="cs-counter"><span id="cs-description-count">${(settings.description || '').length}</span>/2000</span>
        </div>

        <div class="cs-field">
          <label for="cs-weather-location">Přibližná lokalita (pro počasí) <span class="cs-optional">(nepovinné)</span></label>
          <input type="text" id="cs-weather-location" maxlength="100" value="${escapeAttr(settings.weatherLocation || '')}"
                 placeholder="Např. Třebenice nebo 412 01" />
          <span class="cs-hint">
            🛡️ Z bezpečnostních důvodů úmyslně neukládáme přesnou adresu ani GPS vaší chaty. K zobrazení počasí nám stačí pouze název nejbližší obce nebo PSČ.
          </span>
        </div>
      </section>

      <!-- ─── Section: Uvítání a pravidla ────────────────────────────── -->
      <section class="cs-section">
        <div class="cs-section-header">
          <h2> Uvítání a pravidla</h2>
          <p>Nastavte tón komunikace vaší chaty</p>
        </div>

        <div class="cs-field">
          <label for="cs-welcome">Uvítací zpráva / motto</label>
          <input type="text" id="cs-welcome" maxlength="300" value="${escapeAttr(settings.welcomeMessage || '')}"
                 placeholder="např. U nás je vždy příjemně — ať prší nebo svítí ☀️" />
          <span class="cs-hint">Zobrazí se novým členům v pozvánce a na dashboardu</span>
        </div>

        <div class="cs-field">
          <label for="cs-rules">Domácí řád <span class="cs-optional">(nepovinné)</span></label>
          <textarea id="cs-rules" maxlength="5000" rows="6"
                    placeholder="1. Při odjezdu zavřít okna a okenice&#10;2. Dřevo nosit z kůlny, ne od sousedů&#10;3. Na odpadky máme kontejner za plotem">${escapeHtml(settings.rules || '')}</textarea>
          <span class="cs-counter"><span id="cs-rules-count">${(settings.rules || '').length}</span>/5000</span>
        </div>
      </section>
    </div>

    <!-- TAB 2: PROVOZ A ÚDRŽBA -->
    <div class="cs-tab-pane" id="tab-operations">
      <!-- ─── Section: Odjezdový checklist ───────────────────────────── -->
      <section class="cs-section">
        <div class="cs-section-header">
          <h2>✅ Odjezdový checklist</h2>
          <p>Co zkontrolovat před uzamčením chaty</p>
        </div>

        <div id="cs-checklist-container" class="cs-checklist">
          ${checklist.map((item, i) => renderChecklistItem(item, i)).join('')}
        </div>

        <button type="button" class="cs-btn-add" id="cs-add-checklist-item">
          + Přidat položku
        </button>
      </section>

      <!-- ─── Section: Zazimování ────────────────────────────────────── -->
      <section class="cs-section">
        <div class="cs-section-header">
          <h2>❄️ Zazimování</h2>
          <p>Stav chaty v zimním období</p>
        </div>

        <label class="cs-toggle-row">
          <input type="checkbox" id="cs-winterized" ${settings.isWinterized ? 'checked' : ''} />
          <span class="cs-toggle-label">Chata je zazimovaná</span>
          <span class="cs-hint" style="margin:0;">Zapojí mrazové výstrahy a speciální režim</span>
        </label>
      </section>
    </div>

    <!-- TAB 3: MODULY -->
    <div class="cs-tab-pane" id="tab-modules">
      <!-- ─── Section: Moduly ────────────────────────────────────────── -->
      <section class="cs-section">
        <div class="cs-section-header">
          <h2>🧩 Aktivní moduly</h2>
          <p>Zapněte nebo vypněte funkce podle potřeb vaší rodiny</p>
        </div>

        <div class="cs-features-list">
          ${AVAILABLE_FEATURES.map(f => `
            <label class="cs-feature-item">
              <div class="cs-feature-info">
                <strong>${f.label}</strong>
                <span>${f.description}</span>
              </div>
              <input type="checkbox" class="cs-feature-toggle" data-feature="${f.key}"
                     ${features[f.key] !== false ? 'checked' : ''} />
            </label>
          `).join('')}
        </div>
      </section>
    </div>

    <!-- ─── Save button ────────────────────────────────────────────── -->
    <div class="cs-actions">
      <button type="submit" class="cs-btn-save" id="cs-save-btn">
        Uložit změny
      </button>
    </div>

  </form>`;

  bindSettingsEvents();
}

// ── Checklist item template ─────────────────────────────────────────

function renderChecklistItem(text: string, index: number): string {
  return `
  <div class="cs-checklist-item" data-index="${index}">
    <span class="cs-checklist-drag">⠿</span>
    <input type="text" class="cs-checklist-input" value="${escapeAttr(text)}" maxlength="100"
           placeholder="Položka checklistu" />
    <button type="button" class="cs-checklist-remove" title="Odebrat" data-index="${index}">×</button>
  </div>`;
}

// ── Bind events ─────────────────────────────────────────────────────

function bindSettingsEvents(): void {
  // Tab switching logic
  document.querySelectorAll('.cs-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetId = (e.currentTarget as HTMLElement).dataset.target;
      if (!targetId) return;

      document.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');

      document.querySelectorAll('.cs-tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  // Back button
  document.getElementById('cs-back')?.addEventListener('click', () => {
    navigate('/admin');
  });

  // Character counters
  setupCounter('cs-description', 'cs-description-count', 2000);
  setupCounter('cs-rules', 'cs-rules-count', 5000);

  // Add checklist item
  document.getElementById('cs-add-checklist-item')?.addEventListener('click', () => {
    const container = document.getElementById('cs-checklist-container');
    if (!container) return;
    const items = container.querySelectorAll('.cs-checklist-item');
    if (items.length >= 15) {
      showToast('Maximálně 15 položek v checklistu.', 'error');
      return;
    }
    const div = document.createElement('div');
    div.innerHTML = renderChecklistItem('', items.length);
    const newItem = div.firstElementChild as HTMLElement;
    container.appendChild(newItem);
    newItem.querySelector('input')?.focus();
    bindChecklistRemove(newItem);
  });

  // Bind remove buttons on existing items
  document.querySelectorAll('.cs-checklist-item').forEach(item => {
    bindChecklistRemove(item as HTMLElement);
  });

  // Form submit
  document.getElementById('cs-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    // Switch to tab with first invalid input if any
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) {
        const pane = firstInvalid.closest('.cs-tab-pane');
        if (pane) {
          const tabBtn = document.querySelector(`.cs-tab[data-target="${pane.id}"]`) as HTMLElement;
          if (tabBtn) tabBtn.click();
        }
      }
    }

    // Now validate via our custom library
    if (!validateForm(form)) return;

    const btn = document.getElementById('cs-save-btn') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    const weatherLocationInput = document.getElementById('cs-weather-location') as HTMLInputElement | null;
    const weatherLocation = weatherLocationInput?.value.trim() || '';

    // Validate weather Location
    if (weatherLocation) {
      if (weatherLocation.length < 2) {
        showToast('Lokalita (Město/PSČ) musí mít alespoň 2 znaky.', 'error');
        if (btn) btn.disabled = false;
        return;
      }
      const isLocationValid = await validateWeatherLocation(weatherLocation);
      if (!isLocationValid) {
        showToast('Zadaná lokalita nebyla nalezena. Zkuste existující město nebo PSČ.', 'error');
        if (btn) btn.disabled = false;
        return;
      }
    }
    await saveSettings();
  });
}

function bindChecklistRemove(item: HTMLElement): void {
  item.querySelector('.cs-checklist-remove')?.addEventListener('click', () => {
    item.remove();
  });
}

function setupCounter(textareaId: string, counterId: string, max: number): void {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  const counter = document.getElementById(counterId);
  if (!textarea || !counter) return;
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = String(len);
    counter.style.color = len > max * 0.9 ? 'var(--color-danger, #ef4444)' : '';
  });
}

// ── Save ────────────────────────────────────────────────────────────

async function saveSettings(): Promise<void> {
  const btn = document.getElementById('cs-save-btn') as HTMLButtonElement | null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Ukládám…';
  }

  try {
    // Gather values
    const name = (document.getElementById('cs-name') as HTMLInputElement).value.trim();
    const description = (document.getElementById('cs-description') as HTMLTextAreaElement).value.trim() || null;
    const weatherLocation = (document.getElementById('cs-weather-location') as HTMLInputElement).value.trim() || null;
    const welcomeMessage = (document.getElementById('cs-welcome') as HTMLInputElement).value.trim() || null;
    const rules = (document.getElementById('cs-rules') as HTMLTextAreaElement).value.trim() || null;
    const isWinterized = (document.getElementById('cs-winterized') as HTMLInputElement).checked;

    // Checklist
    const checklistInputs = document.querySelectorAll<HTMLInputElement>('.cs-checklist-input');
    const departureChecklist = Array.from(checklistInputs)
      .map(input => input.value.trim())
      .filter(text => text.length > 0);

    // (empty checklist is OK — no tasks defined yet)

    // Features
    const features: Record<string, boolean> = {};
    document.querySelectorAll<HTMLInputElement>('.cs-feature-toggle').forEach(toggle => {
      const key = toggle.dataset.feature;
      if (key) features[key] = toggle.checked;
    });

    if (name.length < 2) {
      showToast('Název chaty musí mít alespoň 2 znaky.', 'error');
      return;
    }

    if (weatherLocation && weatherLocation.length > 100) {
      showToast('Lokalita pro počasí může mít maximálně 100 znaků.', 'error');
      return;
    }

    const result = await authFetch<CabinSettings>('/api/cabin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        welcomeMessage,
        rules,
        departureChecklist,
        weatherLocation,
        isWinterized,
        features,
      }),
    });

    if (result) {
      settings = result;
      // Sync features & winterized to shared state → nav/router guards update
      setCabinFeatures(result.features);
      setCabinWinterized(result.isWinterized);
      refreshNav();
      showToast('Nastavení uloženo ✓', 'success');
    }
  } catch (error) {
    showToast('Nepodařilo se uložit nastavení.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Uložit změny';
    }
  }
}

// ── Load data ───────────────────────────────────────────────────────

async function loadSettings(): Promise<void> {
  abortController = new AbortController();

  settings = await authFetch<CabinSettings>('/api/cabin', {
    signal: abortController.signal,
  });

  if (settings) {
    renderSettings();
  } else {
    const content = document.getElementById('cs-content');
    if (content) {
      content.innerHTML = `
        <div class="cabin-settings-error">
          <p>Nepodařilo se načíst nastavení chaty.</p>
          <button class="cs-btn-save" id="cs-retry">Zkusit znovu</button>
        </div>`;
      document.getElementById('cs-retry')?.addEventListener('click', loadSettings);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Mount / Unmount ─────────────────────────────────────────────────

async function mount(container: HTMLElement): Promise<void> {
  // Guard: admin only
  if (!isAdmin()) {
    showToast('Přístup pouze pro adminy.', 'error');
    navigate('/dashboard');
    return;
  }

  container.innerHTML = getTemplate();

  // Back button in header
  document.getElementById('cs-back')?.addEventListener('click', () => {
    navigate('/admin');
  });

  await loadSettings();
}

function unmount(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  settings = null;
}

const cabinSettingsPage: PageModule = { mount, unmount };
export default cabinSettingsPage;

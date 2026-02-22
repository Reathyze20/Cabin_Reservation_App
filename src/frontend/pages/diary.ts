/* ============================================================================
   pages/diary.ts — Diary / Journal with folders, calendar, notebook modal
   ============================================================================ */
import type { PageModule } from '../lib/router';
import {
  $, show, hide, showToast, authFetch,
  getUsername, getRole, getUserId,
} from '../lib/common';
import { showConfirm } from '../lib/dialogs';

// ─── State ────────────────────────────────────────────────────────────
let container: HTMLElement;
let currentFolderId: string | null = null;
let currentEntries: any[] = [];
let currentSelectedDate: string | null = null;
let currentEntryId: string | null = null;
let currentEntryPhotoIds: string[] = [];
let currentNotebookPhotosData: any[] = [];
let currentLightboxIndex = 0;
let selectedFolderId: string | null = null;
let allFolders: any[] = [];
let pickerCurrentFolderId: string | null = null;
let pickerSelectedPhotoIds = new Set<string>();
let allGalleryFolders: any[] = [];
let currentGalleryPhotos: any[] = [];
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let currentPeriodFilter: string = 'all';

// ─── Template ─────────────────────────────────────────────────────────
function getTemplate(): string {
  return `
  <div class="main-content-diary">
    <div class="diary-card">
      <!-- Folders view -->
      <div id="diary-folders-view">
        <div class="diary-header">
          <h2><i class="fas fa-book-open"></i> Deník</h2>
          <div class="header-actions" style="display:flex;gap:15px;align-items:center;">
            <select id="diary-period-filter" class="form-control" style="width:auto; padding:5px 10px; font-size:0.9rem; margin-bottom:0;">
              <option value="all">Všechna období</option>
              <option value="current_year">Tento rok</option>
              <option value="last_year">Minulý rok</option>
              <option value="older">Starší</option>
            </select>
            <button id="create-diary-folder-btn" class="button-primary"><i class="fas fa-plus"></i> Nový pobyt</button>
          </div>
        </div>
        <div class="diary-content-wrapper">
          <div id="diary-folders-grid"></div>
        </div>
      </div>

      <!-- Entries view -->
      <div id="diary-entries-view" style="display:none">
        <div class="diary-header">
          <div style="display:flex;align-items:center;gap:10px">
            <button id="back-to-diary-folders-btn" class="button-secondary"><i class="fas fa-arrow-left"></i> Zpět</button>
            <h2 id="current-diary-title"></h2>
          </div>
        </div>
        <div class="diary-content-wrapper">
          <div class="diary-calendar-wrapper">
            <div id="diary-calendar" class="diary-calendar"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Create folder modal -->
  <div id="create-diary-folder-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="create-diary-folder-modal">&times;</span>
      <h2>Nový pobyt</h2>
      <div class="form-group" style="margin-bottom: 20px;">
        <label>Vybrat z rezervací (Volitelné)</label>
        <select id="diary-reservation-select" class="form-control">
          <option value="">-- Nevybráno (Zadat ručně) --</option>
        </select>
        <small class="text-muted">Předvyplní název a data podle tvé rezervace.</small>
      </div>
      <form id="create-diary-folder-form">
        <div class="form-group"><label>Název</label><input type="text" id="diary-folder-name-input" required /></div>
        <div class="form-group"><label>Od</label><input type="date" id="diary-start-date" required /></div>
        <div class="form-group"><label>Do</label><input type="date" id="diary-end-date" required /></div>
        <div class="form-group">
          <label>Téma / Štítek</label>
          <select id="diary-activity-tag" class="form-control">
            <option value="">📓 Obyčejný deník</option>
            <option value="relax">🍂 Podzimní relax</option>
            <option value="party">🎉 Oslava / Párty</option>
            <option value="work">🔨 Pracovní brigáda</option>
            <option value="mushroom">🍄 Houbaření</option>
            <option value="hike">👟 Výlety a túry</option>
            <option value="family">👨‍👩‍👧‍👦 Rodinné setkání</option>
          </select>
        </div>
        <div class="modal-buttons"><button type="submit" class="button-primary">Vytvořit</button></div>
      </form>
    </div>
  </div>

  <!-- Rename folder modal -->
  <div id="rename-diary-folder-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="rename-diary-folder-modal">&times;</span>
      <h2>Přejmenovat</h2>
      <p>Původní: <strong id="old-diary-folder-name"></strong></p>
      <form id="rename-diary-folder-form">
        <div class="form-group"><input type="text" id="new-diary-folder-name-input" required /></div>
        <div class="modal-buttons"><button type="submit" class="button-primary">Přejmenovat</button></div>
      </form>
    </div>
  </div>

  <!-- Delete folder modal -->
  <div id="delete-diary-folder-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="delete-diary-folder-modal">&times;</span>
      <h2>Smazat pobyt</h2>
      <p>Pro potvrzení napište <strong>DELETE</strong>:</p>
      <form id="delete-diary-folder-form">
        <div class="form-group"><input type="text" id="delete-diary-confirm-input" required /></div>
        <div class="modal-buttons"><button type="submit" class="button-danger">Smazat</button></div>
      </form>
    </div>
  </div>

  <!-- Notebook modal -->
  <div id="notebook-modal" class="modal-overlay hidden">
    <div class="notebook-modal-content">
      <button id="notebook-prev-btn" class="notebook-nav-btn"><i class="fas fa-chevron-left"></i></button>
      <div class="notebook-paper">
        <div class="notebook-holes"></div>
        <div class="notebook-header">
          <span id="notebook-date-display"></span>
          <span class="notebook-close-button">&times;</span>
        </div>
        <div class="notebook-body">
          <textarea id="notebook-textarea" placeholder="Co se dnes dělo..."></textarea>
          <div id="notebook-attachments-area" class="notebook-attachments"></div>
        </div>
        <div class="notebook-footer">
          <button id="attach-photo-btn" class="notebook-btn-attach"><i class="fas fa-camera"></i> Fotky</button>
          <button id="delete-notebook-entry-btn" class="notebook-btn-delete" style="display:none"><i class="fas fa-eraser"></i> Vytrhnout</button>
          <button id="save-notebook-entry-btn" class="notebook-btn-save"><i class="fas fa-save"></i> Uložit</button>
        </div>
      </div>
      <button id="notebook-next-btn" class="notebook-nav-btn"><i class="fas fa-chevron-right"></i></button>
    </div>
  </div>

  <!-- Gallery photo picker -->
  <div id="select-gallery-photo-modal" class="modal-overlay hidden">
    <div class="modal-content" style="max-width:600px">
      <span class="modal-close-button" data-close="select-gallery-photo-modal">&times;</span>
      <h2>Vybrat fotky</h2>
      <button id="gallery-picker-back-btn" class="gallery-btn" style="display:none;margin-bottom:10px"><i class="fas fa-arrow-left"></i> Zpět</button>
      <div id="gallery-picker-folders" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px"></div>
      <div id="gallery-picker-photos" style="display:none;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px"></div>
      <div class="modal-buttons" style="margin-top:10px"><button id="gallery-picker-confirm-btn" class="button-primary">Potvrdit výběr</button></div>
    </div>
  </div>

  <!-- Lightbox -->
  <div id="diary-lightbox-modal" class="lightbox-overlay" style="display:none">
    <div class="lightbox-content">
      <img id="diary-lightbox-img" src="" alt="" />
      <div class="lightbox-caption"><span id="diary-lightbox-description"></span></div>
    </div>
    <div class="lightbox-controls">
      <button id="diary-lightbox-close" title="Zavřít"><i class="fas fa-times"></i></button>
      <a id="diary-lightbox-download" download="foto.jpg"><i class="fas fa-download"></i></a>
    </div>
    <button id="diary-lightbox-prev" class="lightbox-arrow lightbox-arrow-left"><i class="fas fa-chevron-left"></i></button>
    <button id="diary-lightbox-next" class="lightbox-arrow lightbox-arrow-right"><i class="fas fa-chevron-right"></i></button>
  </div>`;
}

// ─── Modal helpers ────────────────────────────────────────────────────
function showModal(id: string): void { const el = $(id); if (el) { el.classList.remove('hidden'); el.style.display = 'flex'; } }
function hideModal(id: string): void { const el = $(id); if (el) { el.classList.add('hidden'); el.style.display = 'none'; } }

// ─── Folders ──────────────────────────────────────────────────────────

function getTagIcon(tag: string): string {
  switch (tag) {
    case 'relax': return '<i class="fas fa-leaf" style="color: #d97706;"></i>';
    case 'party': return '<i class="fas fa-glass-cheers" style="color: #ec4899;"></i>';
    case 'work': return '<i class="fas fa-hammer" style="color: #64748b;"></i>';
    case 'mushroom': return '<span style="font-size: 1.2em;">🍄</span>';
    case 'hike': return '<i class="fas fa-shoe-prints" style="color: #10b981;"></i>';
    case 'family': return '<i class="fas fa-users" style="color: #3b82f6;"></i>';
    default: return '<i class="fas fa-book-journal-whills" style="color:#fbbf24;"></i>';
  }
}

async function loadFolders(): Promise<void> {
  const data = await authFetch<any[]>('/api/diary/folders', { silent: true });
  if (data) { allFolders = data; renderFolders(data); }
}

function renderFolders(folders: any[]): void {
  const grid = $('diary-folders-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const currentYear = new Date().getFullYear();
  const filteredFolders = folders.filter(f => {
    if (currentPeriodFilter === 'all') return true;
    const pDate = f.startDate ? new Date(f.startDate) : new Date(f.createdAt);
    const folderYear = pDate.getFullYear();
    if (currentPeriodFilter === 'current_year') return folderYear === currentYear;
    if (currentPeriodFilter === 'last_year') return folderYear === currentYear - 1;
    if (currentPeriodFilter === 'older') return folderYear < currentYear - 1;
    return true;
  });

  if (!filteredFolders.length) {
    grid.innerHTML = '<p class="empty-state" style="grid-column: 1 / -1; text-align: center; color: var(--color-text-light);">Zatím zde nejsou žádné deníky pro toto období.</p>';
    return;
  }

  for (const f of filteredFolders) {
    const el = document.createElement('div');
    el.className = 'folder-card diary-folder';
    el.dataset.id = f.id;
    el.onclick = (e) => {
      // Ignore clicks on buttons inside the card
      if (!(e.target as HTMLElement).closest('button')) {
        openFolder(f.id, f.name);
      }
    };

    let dateRange = '';
    if (f.startDate && f.endDate) {
      const d1 = new Date(f.startDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
      const d2 = new Date(f.endDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
      dateRange = `<div class="folder-dates">${d1} — ${d2}</div>`;
    }

    const stats = f.stats || { entries: 0, photos: 0 };

    el.innerHTML = `
      <div class="folder-icon-large">${getTagIcon(f.activityTag)}</div>
      <div class="folder-info">
        <h3>${f.name}</h3>
        ${dateRange}
        <div class="folder-stats-badges">
          <span class="badge" style="background:#f3f4f6; color:#4b5563;"><i class="fas fa-pencil"></i> ${stats.entries} dnů</span>
          <span class="badge" style="background:#f3f4f6; color:#4b5563;"><i class="fas fa-camera"></i> ${stats.photos} fotek</span>
        </div>
      </div>
      <div class="folder-card-hover-actions">
        <button class="icon-btn edit-folder-btn" title="Přejmenovat" data-id="${f.id}"><i class="fas fa-edit"></i></button>
        <button class="icon-btn delete-folder-btn" title="Odstranit" data-id="${f.id}"><i class="fas fa-trash"></i></button>
      </div>`;
    grid.appendChild(el);
  }

  // Attach direct action listeners for the hover buttons
  grid.querySelectorAll('.edit-folder-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      const f = allFolders.find(x => x.id === id);
      if (f) triggerRename(id, f.name);
    });
  });

  grid.querySelectorAll('.delete-folder-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      triggerDelete(id);
    });
  });
}

function triggerRename(id: string, currentName: string): void {
  selectedFolderId = id;
  $<HTMLInputElement>('new-diary-folder-name-input')!.value = currentName;
  const old = $('old-diary-folder-name');
  if (old) old.textContent = currentName;
  showModal('rename-diary-folder-modal');
}

function triggerDelete(id: string): void {
  selectedFolderId = id;
  showModal('delete-diary-folder-modal');
}

function openFolder(id: string, name: string): void {
  currentFolderId = id;
  const t = $('current-diary-title');
  if (t) t.textContent = name;
  const fv = $('diary-folders-view');
  const ev = $('diary-entries-view');
  if (fv) fv.style.display = 'none';
  if (ev) ev.style.display = 'flex';
  selectedFolderId = null;
  loadEntries(id);
}

function backToFolders(): void {
  const ev = $('diary-entries-view');
  const fv = $('diary-folders-view');
  if (ev) ev.style.display = 'none';
  if (fv) fv.style.display = 'flex';
  currentFolderId = null;
  loadFolders();
}

// ─── Entries / Calendar ───────────────────────────────────────────────

async function loadEntries(folderId: string): Promise<void> {
  const data = await authFetch<any[]>(`/api/diary/entries?folderId=${folderId}`);
  if (data) { currentEntries = data; renderCalendar(); }
}

function renderCalendar(): void {
  const cal = $('diary-calendar');
  if (!cal) return;
  cal.innerHTML = '';
  const folder = allFolders.find((f: any) => f.id === currentFolderId);
  if (!folder) return;
  const start = new Date(folder.startDate);
  const end = new Date(folder.endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    const entry = currentEntries.find((e: any) => e.date === ds);
    const card = document.createElement('div');
    card.className = `diary-day-card${entry ? ' has-entry' : ''}`;
    const dayName = d.toLocaleDateString('cs-CZ', { weekday: 'short' });
    let preview = entry ? entry.content.substring(0, 50) : '';
    if (entry?.galleryPhotoIds?.length) preview += ' <i class="fas fa-image"></i>';
    card.innerHTML = `<div class="day-header-row"><span>${dayName}</span></div><div class="day-number">${d.getDate()}</div><div class="entry-preview">${preview}</div>`;
    const clickDate = new Date(d);
    card.onclick = () => openNotebook(clickDate, entry);
    cal.appendChild(card);
  }
}

// ─── Notebook ─────────────────────────────────────────────────────────

async function openNotebook(dateObj: Date, entry: any): Promise<void> {
  currentSelectedDate = dateObj.toISOString().split('T')[0];
  currentEntryId = entry?.id || null;
  currentEntryPhotoIds = entry?.galleryPhotoIds ? [...entry.galleryPhotoIds] : [];

  const dd = $('notebook-date-display');
  if (dd) dd.textContent = dateObj.toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const ta = $<HTMLTextAreaElement>('notebook-textarea');
  if (ta) { ta.value = entry?.content || ''; }
  const del = $('delete-notebook-entry-btn');
  if (del) del.style.display = entry ? 'flex' : 'none';

  await renderNotebookAttachments();
  showModal('notebook-modal');
  if (ta) ta.scrollTop = 0;
}

async function renderNotebookAttachments(): Promise<void> {
  const area = $('notebook-attachments-area');
  if (!area) return;
  area.innerHTML = '';
  currentNotebookPhotosData = [];
  if (!currentEntryPhotoIds.length) return;

  const ids = currentEntryPhotoIds.join(',');
  const photos = await authFetch<any[]>(`/api/gallery/photos?ids=${ids}`);
  if (!photos) return;

  currentEntryPhotoIds.forEach((pid, idx) => {
    const photo = photos.find((p: any) => p.id === pid);
    if (!photo) return;
    currentNotebookPhotosData.push(photo);

    const wrap = document.createElement('div');
    wrap.className = 'attachment-thumbnail-wrapper';
    const img = document.createElement('img');
    img.src = photo.thumb || photo.src;
    img.className = 'attachment-thumbnail';
    img.alt = 'Foto';
    img.loading = 'lazy';
    img.onclick = () => openLightbox(idx);

    const rm = document.createElement('div');
    rm.className = 'attachment-remove-btn';
    rm.innerHTML = '&times;';
    rm.title = 'Odebrat';
    rm.onclick = (e) => {
      e.stopPropagation();
      currentEntryPhotoIds = currentEntryPhotoIds.filter((id) => id !== pid);
      renderNotebookAttachments();
    };

    wrap.appendChild(img);
    wrap.appendChild(rm);
    area.appendChild(wrap);
  });
}

// ─── Lightbox ─────────────────────────────────────────────────────────

function openLightbox(index: number): void {
  currentLightboxIndex = index;
  updateLightboxContent();
  const m = $('diary-lightbox-modal');
  if (m) m.style.display = 'flex';
}

function updateLightboxContent(): void {
  const photo = currentNotebookPhotosData[currentLightboxIndex];
  if (!photo) return;
  const img = $<HTMLImageElement>('diary-lightbox-img');
  const dl = $<HTMLAnchorElement>('diary-lightbox-download');
  const desc = $('diary-lightbox-description');
  if (img) img.src = photo.src;
  if (dl) dl.href = photo.src;
  if (desc) desc.textContent = photo.description || '';
}

function closeLightbox(): void {
  const m = $('diary-lightbox-modal');
  if (m) m.style.display = 'none';
}

// ─── Gallery Picker ───────────────────────────────────────────────────

function renderPickerFolders(): void {
  const el = $('gallery-picker-folders');
  if (!el) return;
  el.innerHTML = '';
  for (const f of allGalleryFolders) {
    const d = document.createElement('div');
    d.className = 'folder-card';
    d.style.cssText = 'height:120px;padding:10px;cursor:pointer';
    d.innerHTML = `<div class="folder-icon" style="font-size:2em;margin-bottom:5px"><i class="fas fa-folder"></i></div><div class="folder-info"><h3 style="font-size:.9em;margin:0">${f.name}</h3></div>`;
    d.onclick = () => openPickerFolder(f.id);
    el.appendChild(d);
  }
}

async function openPickerFolder(folderId: string): Promise<void> {
  pickerCurrentFolderId = folderId;
  const photos = await authFetch<any[]>(`/api/gallery/photos?folderId=${folderId}`);
  currentGalleryPhotos = photos || [];
  const pf = $('gallery-picker-folders');
  const pp = $('gallery-picker-photos');
  const bb = $('gallery-picker-back-btn');
  if (pf) pf.style.display = 'none';
  if (pp) pp.style.display = 'grid';
  if (bb) bb.style.display = 'flex';
  renderPickerPhotos();
}

function renderPickerPhotos(): void {
  const el = $('gallery-picker-photos');
  if (!el) return;
  el.innerHTML = '';
  for (const photo of currentGalleryPhotos) {
    const d = document.createElement('div');
    d.style.cssText = 'position:relative;cursor:pointer';
    const isSel = pickerSelectedPhotoIds.has(photo.id) || currentEntryPhotoIds.includes(photo.id);
    const isAttached = currentEntryPhotoIds.includes(photo.id);

    const img = document.createElement('img');
    img.src = photo.thumb || photo.src;
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:4px';
    if (isSel) { img.style.border = '3px solid #d97706'; img.style.opacity = '0.7'; }
    if (isAttached) { img.style.filter = 'grayscale(100%)'; d.title = 'Již připojeno'; }
    d.appendChild(img);

    if (isSel && !isAttached) {
      const ch = document.createElement('div');
      ch.innerHTML = '<i class="fas fa-check"></i>';
      ch.style.cssText = 'position:absolute;top:5px;right:5px;color:#d97706;font-size:1.2em';
      d.appendChild(ch);
    }
    if (!isAttached) {
      d.onclick = () => {
        if (pickerSelectedPhotoIds.has(photo.id)) pickerSelectedPhotoIds.delete(photo.id);
        else pickerSelectedPhotoIds.add(photo.id);
        renderPickerPhotos();
      };
    }
    el.appendChild(d);
  }
}

// ─── Events ───────────────────────────────────────────────────────────

function bindEvents(): void {
  // Close buttons
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => hideModal(btn.dataset.close!));
  });
  container.querySelectorAll<HTMLElement>('.modal-overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) hide(ov); });
  });

  // Period filter
  const pfBox = $('diary-period-filter') as HTMLSelectElement;
  if (pfBox) {
    pfBox.value = currentPeriodFilter; // Zajištění stavu při re-renderu
    pfBox.addEventListener('change', (e) => {
      currentPeriodFilter = (e.target as HTMLSelectElement).value;
      renderFolders(allFolders);
    });
  }

  // Folder CRUD
  $('create-diary-folder-btn')?.addEventListener('click', async () => {
    showModal('create-diary-folder-modal');
    // Load reservations for the dropdown
    const select = $<HTMLSelectElement>('diary-reservation-select');
    if (select) {
      select.innerHTML = '<option value="">-- Nevybráno (Zadat ručně) --</option>';
      const res = await authFetch<any[]>('/api/reservations', { silent: true });
      if (res) {
        const myId = getUserId();
        const myReservations = res.filter((r) => String(r.userId) === String(myId));
        // Sort newest first
        myReservations.sort((a, b) => new Date(b.from).getTime() - new Date(a.from).getTime());

        myReservations.forEach((r) => {
          const opt = document.createElement('option');
          opt.value = JSON.stringify({ name: r.purpose || 'Pobyt na chatě', from: r.from, to: r.to });
          const d1 = new Date(r.from).toLocaleDateString('cs-CZ');
          const d2 = new Date(r.to).toLocaleDateString('cs-CZ');
          opt.textContent = `${d1} - ${d2} (${r.purpose || 'Pobyt'})`;
          select.appendChild(opt);
        });
      }
    }
  });

  $<HTMLSelectElement>('diary-reservation-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val) {
      try {
        const data = JSON.parse(val);
        $<HTMLInputElement>('diary-folder-name-input')!.value = data.name;
        $<HTMLInputElement>('diary-start-date')!.value = data.from;
        $<HTMLInputElement>('diary-end-date')!.value = data.to;
      } catch (e) { }
    } else {
      $<HTMLInputElement>('diary-folder-name-input')!.value = '';
      $<HTMLInputElement>('diary-start-date')!.value = '';
      $<HTMLInputElement>('diary-end-date')!.value = '';
    }
  });
  $<HTMLFormElement>('create-diary-folder-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await authFetch('/api/diary/folders', {
      method: 'POST', body: JSON.stringify({
        name: $<HTMLInputElement>('diary-folder-name-input')!.value,
        startDate: $<HTMLInputElement>('diary-start-date')!.value,
        endDate: $<HTMLInputElement>('diary-end-date')!.value,
        activityTag: $<HTMLSelectElement>('diary-activity-tag')?.value || null,
      }),
    });
    if (r) { hideModal('create-diary-folder-modal'); showToast('Vytvořeno.', 'success'); loadFolders(); }
  });

  $<HTMLFormElement>('rename-diary-folder-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>('new-diary-folder-name-input')?.value;
    const r = await authFetch(`/api/diary/folders/${selectedFolderId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    if (r) { hideModal('rename-diary-folder-modal'); selectedFolderId = null; showToast('Přejmenováno.', 'success'); loadFolders(); }
  });

  $<HTMLFormElement>('delete-diary-folder-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if ($<HTMLInputElement>('delete-diary-confirm-input')?.value === 'DELETE') {
      await authFetch(`/api/diary/folders/${selectedFolderId}`, { method: 'DELETE' });
      hideModal('delete-diary-folder-modal');
      selectedFolderId = null;
      showToast('Smazáno.', 'success');
      loadFolders();
    }
  });

  $('back-to-diary-folders-btn')?.addEventListener('click', backToFolders);

  // Notebook actions
  container.querySelector('.notebook-close-button')?.addEventListener('click', () => hideModal('notebook-modal'));

  $('save-notebook-entry-btn')?.addEventListener('click', async () => {
    const content = $<HTMLTextAreaElement>('notebook-textarea')?.value || '';
    if (!content.trim() && !currentEntryPhotoIds.length) { showToast('Stránka je prázdná.', 'error'); return; }

    let result;
    if (currentEntryId) {
      result = await authFetch(`/api/diary/entries/${currentEntryId}`, {
        method: 'PUT', body: JSON.stringify({ content, galleryPhotoIds: currentEntryPhotoIds }),
      });
    } else {
      result = await authFetch('/api/diary/entries', {
        method: 'POST', body: JSON.stringify({ folderId: currentFolderId, date: currentSelectedDate, content, galleryPhotoIds: currentEntryPhotoIds }),
      });
    }
    if (result) { showToast('Uloženo.', 'success'); hideModal('notebook-modal'); if (currentFolderId) loadEntries(currentFolderId); }
  });

  $('delete-notebook-entry-btn')?.addEventListener('click', async () => {
    if (!currentEntryId) return;
    const confirmed = await showConfirm('Vytrhnout stránku?', 'Opravdu chcete smazat tento zápis?', true);
    if (!confirmed) return;
    const r = await authFetch(`/api/diary/entries/${currentEntryId}`, { method: 'DELETE' });
    if (r) { showToast('Vytrženo.', 'success'); hideModal('notebook-modal'); if (currentFolderId) loadEntries(currentFolderId); }
  });

  // Gallery picker
  $('attach-photo-btn')?.addEventListener('click', async () => {
    const folders = await authFetch<any[]>('/api/gallery/folders');
    if (!folders) return;
    allGalleryFolders = folders;
    renderPickerFolders();
    pickerSelectedPhotoIds.clear();
    const pp = $('gallery-picker-photos');
    const pf = $('gallery-picker-folders');
    const bb = $('gallery-picker-back-btn');
    if (pp) pp.style.display = 'none';
    if (pf) pf.style.display = 'grid';
    if (bb) bb.style.display = 'none';
    showModal('select-gallery-photo-modal');
  });

  $('gallery-picker-back-btn')?.addEventListener('click', () => {
    const pp = $('gallery-picker-photos');
    const pf = $('gallery-picker-folders');
    const bb = $('gallery-picker-back-btn');
    if (pp) pp.style.display = 'none';
    if (pf) pf.style.display = 'grid';
    if (bb) bb.style.display = 'none';
  });

  $('gallery-picker-confirm-btn')?.addEventListener('click', () => {
    pickerSelectedPhotoIds.forEach((id) => {
      if (!currentEntryPhotoIds.includes(id)) currentEntryPhotoIds.push(id);
    });
    renderNotebookAttachments();
    hideModal('select-gallery-photo-modal');
  });

  // Lightbox
  $('diary-lightbox-close')?.addEventListener('click', closeLightbox);
  $('diary-lightbox-modal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('lightbox-overlay')) closeLightbox();
  });
  $('diary-lightbox-prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLightboxIndex > 0) { currentLightboxIndex--; updateLightboxContent(); }
  });
  $('diary-lightbox-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLightboxIndex < currentNotebookPhotosData.length - 1) { currentLightboxIndex++; updateLightboxContent(); }
  });

  keydownHandler = (e) => {
    const m = $('diary-lightbox-modal');
    if (!m || m.style.display !== 'flex') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && currentLightboxIndex > 0) { currentLightboxIndex--; updateLightboxContent(); }
    if (e.key === 'ArrowRight' && currentLightboxIndex < currentNotebookPhotosData.length - 1) { currentLightboxIndex++; updateLightboxContent(); }
  };
  document.addEventListener('keydown', keydownHandler);
}

// ─── Page Module ──────────────────────────────────────────────────────

const diaryPage: PageModule = {
  async mount(el) {
    container = el;
    el.innerHTML = getTemplate();
    bindEvents();
    await loadFolders();
  },
  unmount() {
    if (keydownHandler) { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
    currentFolderId = null;
    currentEntries = [];
    allFolders = [];
    currentNotebookPhotosData = [];
  },
};

export default diaryPage;

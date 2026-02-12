/* ============================================================================
   pages/gallery.ts — Photo gallery with folders, lightbox, upload
   ============================================================================ */
import type { PageModule } from '../lib/router';
import {
  $, show, hide, showToast, authFetch, authUpload,
  getUsername, getRole,
} from '../lib/common';

// ─── State ────────────────────────────────────────────────────────────
let container: HTMLElement;
let currentFolderId: string | null = null;
let currentPage = 1;
let currentPhotos: any[] = [];
let currentLightboxIndex = 0;
let allFolders: any[] = [];
let isSelectionMode = false;
let selectedPhotos = new Set<string>();
let selectedFolderId: string | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

const layouts = [
  { classes: ['g-big', 'g-wide', 'g-wide', '', '', '', ''], itemsCount: 7 },
  { classes: ['g-tall', 'g-tall', 'g-tall', 'g-tall', '', '', '', ''], itemsCount: 8 },
  { classes: ['g-wide', 'g-wide', 'g-wide', 'g-wide', 'g-wide', 'g-wide'], itemsCount: 6 },
  { classes: ['g-big', 'g-tall', '', '', 'g-wide', '', ''], itemsCount: 7 },
  { classes: [], itemsCount: 12 },
];

// ─── Template ─────────────────────────────────────────────────────────
function getTemplate(): string {
  return `
  <div class="gallery-card">
    <!-- Folders view -->
    <div id="folders-view">
      <div class="gallery-header">
        <h2><i class="fas fa-images"></i> Galerie</h2>
        <div class="gallery-actions">
          <button id="rename-folder-btn" class="gallery-btn" style="display:none"><i class="fas fa-edit"></i> Přejmenovat</button>
          <button id="delete-folder-list-btn" class="gallery-btn gallery-btn-danger" style="display:none"><i class="fas fa-trash"></i> Smazat</button>
          <button id="create-folder-btn" class="gallery-btn gallery-btn-primary"><i class="fas fa-folder-plus"></i> Nové album</button>
        </div>
      </div>
      <div id="folders-grid" class="folders-grid"></div>
    </div>

    <!-- Photos view -->
    <div id="photos-view" style="display:none">
      <div class="gallery-header">
        <div style="display:flex;align-items:center;gap:10px">
          <button id="back-to-folders-btn" class="gallery-btn"><i class="fas fa-arrow-left"></i></button>
          <h2 id="current-folder-title"></h2>
        </div>
        <div class="gallery-actions">
          <button id="toggle-selection-btn" class="gallery-btn"><i class="fas fa-check-square"></i> Vybrat</button>
          <button id="delete-selected-btn" class="gallery-btn gallery-btn-danger" style="display:none">
            <i class="fas fa-trash"></i> Smazat (<span id="selection-count">0</span>)
          </button>
          <button id="upload-photo-btn" class="gallery-btn gallery-btn-primary"><i class="fas fa-cloud-upload-alt"></i> Nahrát</button>
        </div>
      </div>
      <div id="photos-grid" class="photos-grid"></div>
      <div id="pagination-controls" class="pagination-controls" style="display:none">
        <button id="prev-page-btn" class="gallery-btn">← Předchozí</button>
        <span id="page-info">1 / 1</span>
        <button id="next-page-btn" class="gallery-btn">Další →</button>
      </div>
    </div>
  </div>

  <!-- Create folder modal -->
  <div id="create-folder-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="create-folder-modal">&times;</span>
      <h2>Nové album</h2>
      <form id="create-folder-form">
        <div class="form-group">
          <input type="text" id="folder-name-input" placeholder="Název alba" required />
        </div>
        <div class="modal-buttons"><button type="submit" class="button-primary">Vytvořit</button></div>
      </form>
    </div>
  </div>

  <!-- Rename folder modal -->
  <div id="rename-folder-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="rename-folder-modal">&times;</span>
      <h2>Přejmenovat album</h2>
      <p>Původní název: <strong id="old-folder-name"></strong></p>
      <form id="rename-folder-form">
        <input type="hidden" id="rename-folder-id-input" />
        <div class="form-group"><input type="text" id="new-folder-name-input" required /></div>
        <p id="rename-error-msg" class="error-message" style="display:none"></p>
        <div class="modal-buttons"><button type="submit" class="button-primary">Přejmenovat</button></div>
      </form>
    </div>
  </div>

  <!-- Delete folder confirm modal -->
  <div id="delete-folder-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="delete-folder-modal">&times;</span>
      <h2>Smazat album s fotkami</h2>
      <p>Album obsahuje fotky. Pro potvrzení napište <strong>DELETE</strong>:</p>
      <form id="delete-folder-form">
        <div class="form-group"><input type="text" id="delete-confirm-input" required /></div>
        <div class="modal-buttons"><button type="submit" class="button-danger">Smazat</button></div>
      </form>
    </div>
  </div>

  <!-- Upload modal -->
  <div id="upload-photo-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="upload-photo-modal">&times;</span>
      <h2>Nahrát fotky</h2>
      <form id="upload-photo-form">
        <div class="form-group">
          <label class="custom-file-upload">
            <input type="file" id="photo-file-input" accept="image/*" multiple />
            <i class="fas fa-cloud-upload-alt"></i> Vybrat soubory
          </label>
          <span id="file-chosen-text">Nevybrán žádný soubor</span>
        </div>
        <div id="upload-loading-overlay" class="loading-overlay" style="display:none"><div class="spinner"></div></div>
        <div class="modal-buttons"><button type="submit" class="button-primary">Nahrát</button></div>
      </form>
    </div>
  </div>

  <!-- Lightbox -->
  <div id="lightbox-modal" class="lightbox-overlay" style="display:none">
    <div class="lightbox-content">
      <img id="lightbox-img" src="" alt="" />
      <div class="lightbox-caption">
        <span id="lightbox-description"></span>
        <button id="add-description-btn" class="gallery-btn" style="display:none"><i class="fas fa-pen"></i> Přidat vzpomínku</button>
        <div id="description-form" style="display:none">
          <input type="text" id="description-input" placeholder="Vaše vzpomínka..." />
          <button id="save-description-btn" class="gallery-btn gallery-btn-primary">Uložit</button>
        </div>
      </div>
    </div>
    <div class="lightbox-controls">
      <button id="lightbox-close" title="Zavřít"><i class="fas fa-times"></i></button>
      <a id="lightbox-download" download="foto.jpg"><i class="fas fa-download"></i></a>
      <button id="lightbox-delete" style="display:none"><i class="fas fa-trash"></i></button>
    </div>
    <button id="lightbox-prev" class="lightbox-arrow lightbox-arrow-left"><i class="fas fa-chevron-left"></i></button>
    <button id="lightbox-next" class="lightbox-arrow lightbox-arrow-right"><i class="fas fa-chevron-right"></i></button>
  </div>`;
}

// ─── Modal helpers ────────────────────────────────────────────────────
function showModal(id: string): void { const el = $(id); if (el) { el.classList.remove('hidden'); el.style.display = 'flex'; } }
function hideModal(id: string): void { const el = $(id); if (el) { el.classList.add('hidden'); el.style.display = 'none'; } }

// ─── Folders ──────────────────────────────────────────────────────────

async function loadFolders(): Promise<void> {
  const data = await authFetch<any[]>('/api/gallery/folders', { silent: true });
  if (data) { allFolders = data; renderFolders(data); }
}

function renderFolders(folders: any[]): void {
  const grid = $('folders-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!folders.length) { grid.innerHTML = '<p class="empty-state">Zatím tu nejsou žádná alba.</p>'; return; }

  for (const f of folders) {
    const el = document.createElement('div');
    el.className = `folder-card${f.id === selectedFolderId ? ' selected' : ''}`;
    el.dataset.id = f.id;
    el.onclick = (e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') openFolder(f.id, f.name); };
    el.innerHTML = `
      <div class="folder-checkbox-wrapper">
        <input type="checkbox" class="folder-checkbox" data-id="${f.id}" ${f.id === selectedFolderId ? 'checked' : ''}>
      </div>
      <div class="folder-icon"><i class="fas fa-folder"></i></div>
      <div class="folder-info">
        <h3>${f.name}</h3>
        <span class="folder-date">Vytvořeno: ${new Date(f.createdAt).toLocaleDateString('cs-CZ')}</span>
        <span class="folder-owner" style="display:block;font-size:.8em;color:#6b7280;margin-top:4px">Vytvořil: ${f.createdBy || 'Neznámý'}</span>
      </div>`;
    grid.appendChild(el);
  }
  setupFolderCheckboxes();
  updateFolderActionsUI();
}

function setupFolderCheckboxes(): void {
  const grid = $('folders-grid');
  if (!grid) return;
  grid.querySelectorAll<HTMLInputElement>('.folder-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id!;
      grid.querySelectorAll<HTMLInputElement>('.folder-checkbox').forEach((o) => {
        if (o.dataset.id !== id) { o.checked = false; o.closest('.folder-card')?.classList.remove('selected'); }
      });
      if (cb.checked) {
        selectedFolderId = id;
        cb.closest('.folder-card')?.classList.add('selected');
      } else {
        selectedFolderId = null;
        cb.closest('.folder-card')?.classList.remove('selected');
      }
      updateFolderActionsUI();
    });
  });
}

function updateFolderActionsUI(): void {
  const rb = $('rename-folder-btn');
  const db = $('delete-folder-list-btn');
  if (rb) rb.style.display = selectedFolderId ? 'inline-flex' : 'none';
  if (db) db.style.display = selectedFolderId ? 'inline-flex' : 'none';
}

function openFolder(folderId: string, name: string): void {
  currentFolderId = folderId;
  const title = $('current-folder-title');
  if (title) title.textContent = name;
  currentPage = 1;
  isSelectionMode = false;
  selectedPhotos.clear();
  updateSelectionUI();
  const fv = $('folders-view');
  const pv = $('photos-view');
  if (fv) fv.style.display = 'none';
  if (pv) pv.style.display = 'flex';
  loadPhotos(folderId);
}

function backToFolders(): void {
  const pv = $('photos-view');
  const fv = $('folders-view');
  if (pv) pv.style.display = 'none';
  if (fv) fv.style.display = 'flex';
  currentFolderId = null;
  isSelectionMode = false;
  selectedPhotos.clear();
  selectedFolderId = null;
  loadFolders();
}

// ─── Photos ───────────────────────────────────────────────────────────

async function loadPhotos(folderId: string): Promise<void> {
  const data = await authFetch<any[]>(`/api/gallery/photos?folderId=${folderId}`, { silent: true });
  if (data) {
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    currentPhotos = data;
    renderPhotos();
  }
}

function renderPhotos(): void {
  const grid = $('photos-grid');
  const pgCtrl = $('pagination-controls');
  if (!grid) return;
  grid.innerHTML = '';

  if (!currentPhotos.length) {
    grid.innerHTML = '<p class="empty-state">Album je prázdné.</p>';
    if (pgCtrl) pgCtrl.style.display = 'none';
    return;
  }

  const li = (currentPage - 1) % layouts.length;
  const layout = layouts[li];
  let startIdx = 0;
  for (let i = 1; i < currentPage; i++) startIdx += layouts[(i - 1) % layouts.length].itemsCount;
  const pagePhotos = currentPhotos.slice(startIdx, startIdx + layout.itemsCount);

  let tmp = 0, totalPages = 0;
  while (tmp < currentPhotos.length) { tmp += layouts[totalPages % layouts.length].itemsCount; totalPages++; }

  pagePhotos.forEach((photo, idx) => {
    const globalIdx = startIdx + idx;
    const el = document.createElement('div');
    el.className = 'photo-card';
    if (isSelectionMode && selectedPhotos.has(photo.id)) el.classList.add('selected');
    if (idx < layout.classes.length && layout.classes[idx]) el.classList.add(layout.classes[idx]);
    el.innerHTML = `<img src="${photo.thumb || photo.src}" alt="Foto" loading="lazy"><div class="photo-overlay"><i class="fas fa-search-plus"></i></div>`;
    el.onclick = (e) => {
      if (isSelectionMode) { e.stopPropagation(); togglePhotoSel(photo.id, el); }
      else openLightbox(globalIdx);
    };
    grid.appendChild(el);
  });

  if (totalPages > 1 && pgCtrl) {
    pgCtrl.style.display = 'flex';
    const info = $('page-info');
    if (info) info.textContent = `${currentPage} / ${totalPages}`;
    const prev = $<HTMLButtonElement>('prev-page-btn');
    const next = $<HTMLButtonElement>('next-page-btn');
    if (prev) prev.disabled = currentPage === 1;
    if (next) next.disabled = currentPage === totalPages;
  } else if (pgCtrl) {
    pgCtrl.style.display = 'none';
  }
}

// ─── Selection ────────────────────────────────────────────────────────

function updateSelectionUI(): void {
  const tb = $('toggle-selection-btn');
  const db = $('delete-selected-btn');
  const sc = $('selection-count');
  if (isSelectionMode) {
    tb?.classList.add('gallery-btn-primary');
    if (tb) tb.innerHTML = '<i class="fas fa-times"></i> Zrušit výběr';
    if (db) db.style.display = 'inline-flex';
    if (sc) sc.textContent = String(selectedPhotos.size);
  } else {
    tb?.classList.remove('gallery-btn-primary');
    if (tb) tb.innerHTML = '<i class="fas fa-check-square"></i> Vybrat';
    if (db) db.style.display = 'none';
  }
}

function togglePhotoSel(id: string, el: HTMLElement): void {
  if (selectedPhotos.has(id)) { selectedPhotos.delete(id); el.classList.remove('selected'); }
  else { selectedPhotos.add(id); el.classList.add('selected'); }
  const sc = $('selection-count');
  if (sc) sc.textContent = String(selectedPhotos.size);
}

// ─── Lightbox ─────────────────────────────────────────────────────────

function openLightbox(index: number): void {
  currentLightboxIndex = index;
  updateLightboxContent();
  const modal = $('lightbox-modal');
  if (modal) modal.style.display = 'flex';
}

function updateLightboxContent(): void {
  const photo = currentPhotos[currentLightboxIndex];
  if (!photo) return;
  const img = $<HTMLImageElement>('lightbox-img');
  const dl = $<HTMLAnchorElement>('lightbox-download');
  const desc = $('lightbox-description');
  const addBtn = $('add-description-btn');
  const form = $('description-form');
  const delBtn = $('lightbox-delete');

  if (img) img.src = photo.src;
  if (dl) { dl.href = photo.src; dl.setAttribute('download', 'foto.jpg'); }
  if (form) form.style.display = 'none';

  if (photo.description) {
    if (desc) { desc.textContent = photo.description; desc.style.display = 'block'; }
    if (addBtn) addBtn.style.display = 'none';
  } else {
    if (desc) { desc.textContent = ''; desc.style.display = 'none'; }
    if (addBtn) addBtn.style.display = 'block';
  }

  const isOwner = photo.uploadedBy === getUsername();
  const isAdm = getRole() === 'admin';
  if (delBtn) {
    delBtn.style.display = (isOwner || isAdm) ? 'inline-flex' : 'none';
    delBtn.onclick = () => deletePhoto(photo.id);
  }
}

function closeLightbox(): void {
  const modal = $('lightbox-modal');
  if (modal) modal.style.display = 'none';
  const img = $<HTMLImageElement>('lightbox-img');
  if (img) img.src = '';
}

async function deletePhoto(photoId: string): Promise<void> {
  if (!confirm('Smazat fotku?')) return;
  const result = await authFetch(`/api/gallery/photos/${photoId}`, { method: 'DELETE' });
  if (result) { showToast('Fotka smazána.', 'success'); closeLightbox(); if (currentFolderId) loadPhotos(currentFolderId); }
}

// ─── Folder delete ────────────────────────────────────────────────────

async function performFolderDeleteCheck(folderId: string, name: string): Promise<void> {
  const photos = await authFetch<any[]>(`/api/gallery/photos?folderId=${folderId}`);
  const isEmpty = photos && photos.length === 0;
  const isAdm = getRole() === 'admin';

  if (isEmpty) {
    if (confirm(`Smazat prázdné album "${name}"?`)) performFolderDelete(folderId);
  } else if (!isAdm) {
    showToast('Album obsahuje fotky. Smazat může jen admin.', 'error');
  } else {
    showModal('delete-folder-modal');
    $<HTMLInputElement>('delete-confirm-input')?.focus();
  }
}

async function performFolderDelete(folderId: string): Promise<void> {
  const result = await authFetch(`/api/gallery/folders/${folderId}`, { method: 'DELETE' });
  if (result) { showToast('Album smazáno.', 'success'); selectedFolderId = null; loadFolders(); }
}

// ─── Event Binding ────────────────────────────────────────────────────

function bindEvents(): void {
  // Close buttons
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => hideModal(btn.dataset.close!));
  });

  // Overlay click to close modals
  container.querySelectorAll<HTMLElement>('.modal-overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) hide(ov); });
  });

  // Create folder
  $('create-folder-btn')?.addEventListener('click', () => { showModal('create-folder-modal'); $<HTMLInputElement>('folder-name-input')?.focus(); });
  $<HTMLFormElement>('create-folder-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>('folder-name-input')?.value.trim();
    if (!name) return;
    const r = await authFetch('/api/gallery/folders', { method: 'POST', body: JSON.stringify({ name }) });
    if (r) { hideModal('create-folder-modal'); showToast('Album vytvořeno.', 'success'); loadFolders(); }
  });

  // Rename folder
  $('rename-folder-btn')?.addEventListener('click', () => {
    if (!selectedFolderId) return;
    const f = allFolders.find((x: any) => x.id === selectedFolderId);
    if (!f) return;
    $<HTMLInputElement>('rename-folder-id-input')!.value = selectedFolderId;
    $<HTMLInputElement>('new-folder-name-input')!.value = f.name;
    const old = $('old-folder-name');
    if (old) old.textContent = f.name;
    showModal('rename-folder-modal');
  });
  $<HTMLFormElement>('rename-folder-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>('new-folder-name-input')?.value.trim();
    const id = $<HTMLInputElement>('rename-folder-id-input')?.value;
    if (!name || !id) return;
    const r = await authFetch(`/api/gallery/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    if (r) { hideModal('rename-folder-modal'); selectedFolderId = null; showToast('Přejmenováno.', 'success'); loadFolders(); }
  });

  // Delete folder
  $('delete-folder-list-btn')?.addEventListener('click', () => {
    if (!selectedFolderId) return;
    const f = allFolders.find((x: any) => x.id === selectedFolderId);
    if (f) performFolderDeleteCheck(selectedFolderId, f.name);
  });
  $<HTMLFormElement>('delete-folder-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if ($<HTMLInputElement>('delete-confirm-input')?.value.trim() === 'DELETE' && selectedFolderId) {
      performFolderDelete(selectedFolderId);
      hideModal('delete-folder-modal');
    } else {
      showToast("Napište 'DELETE' pro potvrzení.", 'error');
    }
  });

  // Back to folders
  $('back-to-folders-btn')?.addEventListener('click', backToFolders);

  // Pagination
  $('prev-page-btn')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPhotos(); } });
  $('next-page-btn')?.addEventListener('click', () => {
    let t = 0, tp = 0;
    while (t < currentPhotos.length) { t += layouts[tp % layouts.length].itemsCount; tp++; }
    if (currentPage < tp) { currentPage++; renderPhotos(); }
  });

  // Selection toggle
  $('toggle-selection-btn')?.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    if (!isSelectionMode) selectedPhotos.clear();
    updateSelectionUI();
    renderPhotos();
  });

  // Delete selected
  $('delete-selected-btn')?.addEventListener('click', async () => {
    if (!selectedPhotos.size) return;
    if (!confirm(`Smazat ${selectedPhotos.size} fotek?`)) return;
    const r = await authFetch('/api/gallery/photos', { method: 'DELETE', body: JSON.stringify({ photoIds: [...selectedPhotos] }) });
    if (r) { showToast('Fotky smazány.', 'success'); selectedPhotos.clear(); isSelectionMode = false; updateSelectionUI(); if (currentFolderId) loadPhotos(currentFolderId); }
  });

  // Upload
  $('upload-photo-btn')?.addEventListener('click', () => {
    showModal('upload-photo-modal');
    const fi = $<HTMLInputElement>('photo-file-input');
    if (fi) fi.value = '';
    const ft = $('file-chosen-text');
    if (ft) ft.textContent = 'Nevybrán žádný soubor';
  });
  $<HTMLInputElement>('photo-file-input')?.addEventListener('change', function () {
    const ft = $('file-chosen-text');
    if (this.files && this.files.length > 0) {
      if (ft) ft.textContent = this.files.length === 1 ? this.files[0].name : `${this.files.length} souborů`;
    } else {
      if (ft) ft.textContent = 'Nevybrán žádný soubor';
    }
  });
  $<HTMLFormElement>('upload-photo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fi = $<HTMLInputElement>('photo-file-input');
    if (!fi?.files?.length || !currentFolderId) return;
    const overlay = $('upload-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    const submitBtn = container.querySelector<HTMLButtonElement>('#upload-photo-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const fd = new FormData();
    fd.append('folderId', currentFolderId);
    for (const file of Array.from(fi.files)) fd.append('photos', file);

    const result = await authUpload('/api/gallery/photos', fd);
    if (result) showToast(`Nahráno ${fi.files.length} fotek.`, 'success');

    if (submitBtn) submitBtn.disabled = false;
    if (overlay) overlay.style.display = 'none';
    hideModal('upload-photo-modal');
    if (fi) fi.value = '';
    if (currentFolderId) loadPhotos(currentFolderId);
  });

  // Lightbox controls
  $('lightbox-close')?.addEventListener('click', closeLightbox);
  $('lightbox-modal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).classList.contains('lightbox-overlay')) closeLightbox();
  });
  $('lightbox-prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLightboxIndex > 0) { currentLightboxIndex--; updateLightboxContent(); }
  });
  $('lightbox-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentLightboxIndex < currentPhotos.length - 1) { currentLightboxIndex++; updateLightboxContent(); }
  });

  // Description
  const showDescForm = () => {
    const photo = currentPhotos[currentLightboxIndex];
    const di = $<HTMLInputElement>('description-input');
    if (di) di.value = photo?.description || '';
    const desc = $('lightbox-description');
    if (desc) desc.style.display = 'none';
    const ab = $('add-description-btn');
    if (ab) ab.style.display = 'none';
    const df = $('description-form');
    if (df) df.style.display = 'flex';
    di?.focus();
  };
  $('lightbox-description')?.addEventListener('click', showDescForm);
  $('add-description-btn')?.addEventListener('click', showDescForm);
  $('save-description-btn')?.addEventListener('click', async () => {
    const val = $<HTMLInputElement>('description-input')?.value.trim() || '';
    const photo = currentPhotos[currentLightboxIndex];
    if (photo) { photo.description = val; updateLightboxContent(); }
    await authFetch(`/api/gallery/photos/${photo.id}`, { method: 'PATCH', body: JSON.stringify({ description: val }) });
    showToast('Vzpomínka uložena.', 'success');
  });

  // Keyboard navigation
  keydownHandler = (e: KeyboardEvent) => {
    const lb = $('lightbox-modal');
    if (!lb || lb.style.display !== 'flex') return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && currentLightboxIndex > 0) { currentLightboxIndex--; updateLightboxContent(); }
    if (e.key === 'ArrowRight' && currentLightboxIndex < currentPhotos.length - 1) { currentLightboxIndex++; updateLightboxContent(); }
  };
  document.addEventListener('keydown', keydownHandler);
}

// ─── Page Module ──────────────────────────────────────────────────────

const galleryPage: PageModule = {
  async mount(el) {
    container = el;
    el.innerHTML = getTemplate();
    bindEvents();
    await loadFolders();
  },
  unmount() {
    if (keydownHandler) { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
    currentFolderId = null;
    currentPhotos = [];
    allFolders = [];
    selectedPhotos.clear();
    isSelectionMode = false;
    selectedFolderId = null;
  },
};

export default galleryPage;

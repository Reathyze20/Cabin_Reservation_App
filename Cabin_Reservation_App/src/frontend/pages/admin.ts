/* ============================================================================
   pages/admin.ts — Admin dashboard (user management, system info)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, decodeJwtPayload, getToken, isAdmin } from '../lib/common';

let container: HTMLElement;
let users: any[] = [];

function getTemplate(): string {
  return `
  <div class="main-content-admin">
    <div class="admin-page-card">
      <div class="admin-section">
        <h2><i class="fas fa-users-cog"></i> Správa uživatelů</h2>

        <div id="users-list" class="users-list"></div>

        <h3 style="margin-top:1.5rem"><i class="fas fa-user-plus"></i> Přidat uživatele</h3>
        <form id="add-user-form" class="add-user-form">
          <div class="form-group"><label>Uživatelské jméno</label><input type="text" id="new-username" required /></div>
          <div class="form-group"><label>Heslo</label><input type="password" id="new-password" required /></div>
          <div class="form-group">
            <label>Role</label>
            <select id="new-role"><option value="member">Člen</option><option value="admin">Admin</option></select>
          </div>
          <button type="submit" class="button-primary"><i class="fas fa-plus"></i> Vytvořit</button>
        </form>
      </div>

      <div class="admin-section" id="system-info">
        <h2><i class="fas fa-server"></i> Systém</h2>
        <div class="system-info" id="sys-info-content">Načítání…</div>
      </div>
    </div>
  </div>

  <!-- Edit user modal -->
  <div id="edit-user-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="edit-user-modal">&times;</span>
      <h2 id="edit-user-title">Upravit uživatele</h2>
      <input type="hidden" id="edit-user-id" />
      <div class="form-group">
        <label>Jméno</label>
        <input type="text" id="edit-username" disabled />
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="edit-role"><option value="member">Člen</option><option value="admin">Admin</option></select>
      </div>
      <div class="form-group">
        <label>Nové heslo (vyplnit pro reset)</label>
        <input type="password" id="edit-password" placeholder="ponechte prázdné" />
      </div>
      <div class="modal-buttons" style="gap:.5rem;flex-wrap:wrap">
        <button class="button-primary" id="btn-save-user"><i class="fas fa-save"></i> Uložit</button>
        <button class="button-danger" id="btn-delete-reservations"><i class="fas fa-calendar-times"></i> Smazat rezervace</button>
        <button class="button-danger" id="btn-delete-user"><i class="fas fa-trash"></i> Smazat uživatele</button>
      </div>
    </div>
  </div>`;
}

async function loadUsers(): Promise<void> {
  const data = await authFetch<any[]>('/api/users', { silent: true });
  if (data) { users = data; renderUsers(data); }
}

function renderUsers(list: any[]): void {
  const el = $('users-list');
  if (!el) return;
  el.innerHTML = list.map((u) => `
    <div class="user-row" data-uid="${u.id}">
      <div>
        <strong>${u.username}</strong>
        <span class="user-role-badge">${u.role === 'admin' ? 'Admin' : 'Člen'}</span>
      </div>
      <button class="gallery-btn btn-edit-user" data-uid="${u.id}"><i class="fas fa-pen"></i></button>
    </div>`).join('');
}

function openEditModal(userId: string): void {
  const user = users.find((u) => String(u.id) === String(userId));
  if (!user) return;
  $<HTMLInputElement>('edit-user-id')!.value = String(user.id);
  $<HTMLInputElement>('edit-username')!.value = user.username;
  $<HTMLSelectElement>('edit-role')!.value = user.role;
  $<HTMLInputElement>('edit-password')!.value = '';
  $<HTMLElement>('edit-user-title')!.textContent = `Upravit: ${user.username}`;
  show($('edit-user-modal'));
}

async function saveUser(): Promise<void> {
  const id = $<HTMLInputElement>('edit-user-id')!.value;
  const role = $<HTMLSelectElement>('edit-role')!.value;
  const newPass = $<HTMLInputElement>('edit-password')!.value;

  const body: Record<string, string> = { role };
  if (newPass) body.password = newPass;

  const r = await authFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  if (r) {
    hide($('edit-user-modal'));
    showToast('Uživatel upraven', 'success');
    loadUsers();
  }
}

async function deleteUserReservations(): Promise<void> {
  const id = $<HTMLInputElement>('edit-user-id')!.value;
  const username = $<HTMLInputElement>('edit-username')!.value;
  if (!confirm(`Opravdu smazat VŠECHNY rezervace uživatele "${username}"?`)) return;
  const r = await authFetch(`/api/users/${id}/reservations`, { method: 'DELETE' });
  if (r) showToast('Rezervace smazány', 'success');
}

async function deleteUser(): Promise<void> {
  const id = $<HTMLInputElement>('edit-user-id')!.value;
  const username = $<HTMLInputElement>('edit-username')!.value;
  if (!confirm(`Opravdu SMAZAT uživatele "${username}"? Toto nelze vrátit!`)) return;
  const r = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
  if (r) {
    hide($('edit-user-modal'));
    showToast('Uživatel smazán', 'success');
    loadUsers();
  }
}

async function loadSystemInfo(): Promise<void> {
  const info = await authFetch<any>('/api/admin/system', { silent: true });
  const el = $('sys-info-content');
  if (!el) return;
  if (!info) { el.textContent = 'Nepodařilo se načíst'; return; }
  el.innerHTML = `
    <div class="info-grid">
      <div><strong>Uživatelé:</strong> ${info.userCount ?? '—'}</div>
      <div><strong>Rezervace:</strong> ${info.reservationCount ?? '—'}</div>
      <div><strong>Fotky:</strong> ${info.photoCount ?? '—'}</div>
      <div><strong>Poznámky:</strong> ${info.noteCount ?? '—'}</div>
    </div>`;
}

function bindEvents(): void {
  // Close modal
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { const el = $(btn.dataset.close!); if (el) hide(el); });
  });
  container.querySelectorAll<HTMLElement>('.modal-overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) hide(ov); });
  });

  // Open edit user (event delegation)
  container.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.btn-edit-user');
    if (btn) openEditModal(btn.dataset.uid!);
  });

  // Modal action buttons
  $('btn-save-user')?.addEventListener('click', saveUser);
  $('btn-delete-reservations')?.addEventListener('click', deleteUserReservations);
  $('btn-delete-user')?.addEventListener('click', deleteUser);

  // Add user form
  $<HTMLFormElement>('add-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      username: $<HTMLInputElement>('new-username')!.value,
      password: $<HTMLInputElement>('new-password')!.value,
      role: $<HTMLSelectElement>('new-role')!.value,
    };
    const r = await authFetch('/api/users', { method: 'POST', body: JSON.stringify(body) });
    if (r) {
      showToast('Uživatel vytvořen', 'success');
      $<HTMLFormElement>('add-user-form')?.reset();
      loadUsers();
    }
  });
}

const adminPage: PageModule = {
  async mount(el) {
    container = el;
    // Double-check admin status client-side
    if (!isAdmin()) {
      el.innerHTML = '<div class="admin-page-card"><h2>Přístup odepřen</h2><p>Nemáte administrátorská oprávnění.</p></div>';
      return;
    }
    el.innerHTML = getTemplate();
    bindEvents();
    await Promise.all([loadUsers(), loadSystemInfo()]);
  },
  unmount() { users = []; },
};

export default adminPage;

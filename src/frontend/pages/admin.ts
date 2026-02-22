/* ============================================================================
   pages/admin.ts — Admin dashboard (user management, system info)
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, decodeJwtPayload, getToken, isAdmin } from '../lib/common';
import { showConfirm } from '../lib/dialogs';

let container: HTMLElement;
let users: any[] = [];

function getTemplate(): string {
  return `
  <div class="main-content-admin">
    <div class="admin-page-card">
      <div class="admin-section users-section">
        <h2><i class="fas fa-users-cog"></i> Správa uživatelů</h2>

        <div id="users-list" class="users-list"></div>

        <div class="add-user-section">
          <h3><i class="fas fa-user-plus"></i> Přidat uživatele</h3>
          <form id="add-user-form" class="add-user-form">
            <div class="form-group"><label>Uživatelské jméno</label><input type="text" id="new-username" required /></div>
            <div class="form-group"><label>Heslo</label><input type="password" id="new-password" required /></div>
            <div class="form-group">
              <label>Role</label>
              <select id="new-role" style="width: 100%; padding: var(--space-sm) 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm);"><option value="member">Člen</option><option value="admin">Admin</option></select>
            </div>
            <button type="submit" class="button-primary" style="height: 38px; margin-bottom: 0;"><i class="fas fa-plus"></i> Vytvořit</button>
          </form>
        </div>
      </div>

      <div class="admin-section" id="system-info">
        <h2><i class="fas fa-server"></i> Systém</h2>
        <div class="system-info" id="sys-info-content">Načítání…</div>
      </div>

      <div class="admin-section" id="server-logs">
        <h2><i class="fas fa-terminal"></i> Logy serveru</h2>
        <div class="logs-controls" style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
          <select id="log-date-select" style="padding: var(--space-sm) 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm);"></select>
          <select id="log-level-select" style="padding: var(--space-sm) 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm);">
            <option value="">Všechny úrovně</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
          <button id="btn-refresh-logs" class="button-secondary" style="margin: 0; padding: 0 15px; height: 38px;"><i class="fas fa-sync-alt"></i> Obnovit</button>
          <button id="btn-download-logs" class="button-secondary" style="margin: 0; padding: 0 15px; height: 38px;"><i class="fas fa-download"></i> Stáhnout</button>
        </div>
        <div class="logs-viewer" id="logs-content" style="background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 8px; font-family: monospace; height: 400px; overflow-y: auto; white-space: pre-wrap; font-size: 13px; line-height: 1.4;">Načítání logů...</div>
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
  el.innerHTML = list.map((u) => {
    const init = u.username.charAt(0).toUpperCase();
    const roleClass = u.role === 'admin' ? 'badge-admin' : 'badge-member';
    const roleText = u.role === 'admin' ? 'Admin' : 'Člen';
    
    return `
    <div class="user-row" data-uid="${u.id}">
      <div class="user-row-left">
        <div class="user-row-avatar">${init}</div>
        <span class="user-row-name">${u.username}</span>
      </div>
      <div class="user-row-middle">
        <span class="user-role-badge ${roleClass}">${roleText}</span>
      </div>
      <div class="user-row-right">
        <i class="fas fa-pen btn-edit-user" data-uid="${u.id}" title="Upravit"></i>
        <i class="fas fa-trash btn-delete-user-icon" data-uid="${u.id}" title="Smazat"></i>
      </div>
    </div>`;
  }).join('');
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
  const confirmed = await showConfirm(
    'Smazat rezervace?',
    `Opravdu smazat VŠECHNY rezervace uživatele "${username}"?`,
    true
  );
  if (!confirmed) return;
  const r = await authFetch(`/api/users/${id}/reservations`, { method: 'DELETE' });
  if (r) showToast('Rezervace smazány', 'success');
}

async function deleteUser(): Promise<void> {
  const id = $<HTMLInputElement>('edit-user-id')!.value;
  const username = $<HTMLInputElement>('edit-username')!.value;
  const confirmed = await showConfirm(
    'Smazat uživatele?',
    `Opravdu SMAZAT uživatele "${username}"? Toto nelze vrátit!`,
    true
  );
  if (!confirmed) return;
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
    <div class="system-stat">
      <div class="stat-value">${info.userCount ?? '—'}</div>
      <div class="stat-label">Uživatelé</div>
    </div>
    <div class="system-stat">
      <div class="stat-value">${info.reservationCount ?? '—'}</div>
      <div class="stat-label">Rezervace</div>
    </div>
    <div class="system-stat">
      <div class="stat-value">${info.photoCount ?? '—'}</div>
      <div class="stat-label">Fotky</div>
    </div>
    <div class="system-stat">
      <div class="stat-value">${info.noteCount ?? '—'}</div>
      <div class="stat-label">Poznámky</div>
    </div>`;
}

async function loadLogFiles(): Promise<void> {
  const data = await authFetch<{ files: string[] }>('/api/logs/files', { silent: true });
  const select = $<HTMLSelectElement>('log-date-select');
  if (!select) return;
  
  if (data && data.files && data.files.length > 0) {
    select.innerHTML = data.files.map(f => `<option value="${f}">${f}</option>`).join('');
  } else {
    const today = new Date().toISOString().split('T')[0];
    select.innerHTML = `<option value="${today}">${today}</option>`;
  }
}

async function loadLogs(): Promise<void> {
  const date = $<HTMLSelectElement>('log-date-select')?.value || new Date().toISOString().split('T')[0];
  const level = $<HTMLSelectElement>('log-level-select')?.value || '';
  
  const el = $('logs-content');
  if (el) el.textContent = 'Načítání logů...';

  let url = `/api/logs?date=${date}&lines=500`;
  if (level) url += `&level=${level}`;

  const data = await authFetch<{ logs: string[] }>(url, { silent: true });
  if (!el) return;

  if (data && data.logs) {
    if (data.logs.length === 0) {
      el.textContent = 'Žádné logy pro tento den/filtr.';
    } else {
      // Colorize log levels
      const formattedLogs = data.logs.map(line => {
        let color = '#d4d4d4';
        if (line.includes('[ERROR]')) color = '#f87171';
        else if (line.includes('[WARN]')) color = '#fbbf24';
        else if (line.includes('[INFO]')) color = '#60a5fa';
        else if (line.includes('[DEBUG]')) color = '#9ca3af';
        
        // Escape HTML to prevent XSS
        const escapedLine = line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<span style="color: ${color}">${escapedLine}</span>`;
      }).join('\n');
      
      el.innerHTML = formattedLogs;
      // Scroll to bottom
      el.scrollTop = el.scrollHeight;
    }
  } else {
    el.textContent = 'Nepodařilo se načíst logy.';
  }
}

function downloadLogs(): void {
  const el = $('logs-content');
  if (!el) return;
  
  const date = $<HTMLSelectElement>('log-date-select')?.value || 'logs';
  const text = el.textContent || '';
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chata-logs-${date}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    
    const editBtn = target.closest<HTMLElement>('.btn-edit-user');
    if (editBtn) {
      openEditModal(editBtn.dataset.uid!);
      return;
    }

    const deleteBtn = target.closest<HTMLElement>('.btn-delete-user-icon');
    if (deleteBtn) {
      const uid = deleteBtn.dataset.uid!;
      const user = users.find((u) => String(u.id) === String(uid));
      if (!user) return;
      const confirmed = await showConfirm(
        'Smazat uživatele?',
        `Opravdu SMAZAT uživatele "${user.username}"? Toto nelze vrátit!`,
        true
      );
      if (!confirmed) return;
      const r = await authFetch(`/api/users/${uid}`, { method: 'DELETE' });
      if (r) {
        showToast('Uživatel smazán', 'success');
        loadUsers();
      }
    }
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

  // Logs controls
  $('btn-refresh-logs')?.addEventListener('click', loadLogs);
  $('btn-download-logs')?.addEventListener('click', downloadLogs);
  $('log-date-select')?.addEventListener('change', loadLogs);
  $('log-level-select')?.addEventListener('change', loadLogs);
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
    await Promise.all([loadUsers(), loadSystemInfo(), loadLogFiles()]);
    await loadLogs();
  },
  unmount() { users = []; },
};

export default adminPage;

/* ============================================================================
   pages/superadmin.ts — Super Admin Back-office
   ============================================================================ */

import { authFetch, showToast, $ } from "../lib/common";
import "../styles/superadmin.css";

interface User {
  id: string;
  username: string;
  email: string | null;
  role: string;
  isSuperAdmin: boolean;
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
}

interface SystemLog {
  id: string;
  level: string;
  message: string;
  metadata: any;
  userId: string | null;
  createdAt: string;
  user: {
    username: string;
    email: string | null;
  } | null;
}

let currentTab: "users" | "logs" = "users";

// ─── Template ────────────────────────────────────────────────────────────────
export function getTemplate(): string {
  return `
    <div class="superadmin-container">
      <h1>🛡️ Super Admin — Velení</h1>
      
      <div class="tabs">
        <button id="tab-users" class="tab-button active">Uživatelé</button>
        <button id="tab-logs" class="tab-button">Systémový Log</button>
      </div>

      <div id="tab-content-users" class="tab-content active">
        <div class="toolbar">
          <button id="btn-add-user" class="btn btn-primary">+ Přidat uživatele</button>
          <button id="btn-refresh-users" class="btn btn-secondary">🔄 Obnovit</button>
        </div>
        <div id="users-table-container"></div>
      </div>

      <div id="tab-content-logs" class="tab-content">
        <div class="toolbar">
          <button id="btn-refresh-logs" class="btn btn-secondary">🔄 Obnovit</button>
        </div>
        <div id="logs-table-container"></div>
      </div>
    </div>

    <!-- Modal pro detail logu -->
    <div id="log-detail-modal" class="modal">
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <h2>Detail chyby</h2>
        <div id="log-detail-content"></div>
      </div>
    </div>

    <!-- Modal pro přidání uživatele -->
    <div id="add-user-modal" class="modal">
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <h2>Přidat nového uživatele</h2>
        <form id="add-user-form">
          <label>
            Username:
            <input type="text" name="username" required maxlength="50">
          </label>
          <label>
            E-mail:
            <input type="email" name="email" required>
          </label>
          <label>
            Role:
            <select name="role" required>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="guest">Guest</option>
            </select>
          </label>
          <button type="submit" class="btn btn-primary">Vytvořit</button>
        </form>
      </div>
    </div>
  `;
}

// ─── Mount ───────────────────────────────────────────────────────────────────
export async function mount(el: HTMLElement): Promise<void> {
  el.innerHTML = getTemplate();
  bindEvents();
  await loadUsers();
}

export function unmount(): void {
  // Cleanup
}

// ─── Event Bindings ──────────────────────────────────────────────────────────
function bindEvents(): void {
  // Tab switching
  $("#tab-users")?.addEventListener("click", () => switchTab("users"));
  $("#tab-logs")?.addEventListener("click", () => switchTab("logs"));

  // Toolbar buttons
  $("#btn-add-user")?.addEventListener("click", openAddUserModal);
  $("#btn-refresh-users")?.addEventListener("click", loadUsers);
  $("#btn-refresh-logs")?.addEventListener("click", loadLogs);

  // Modal close buttons
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeModals);
  });

  // Add user form
  $("#add-user-form")?.addEventListener("submit", handleAddUser);

  // Close modal on outside click
  window.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("modal")) {
      closeModals();
    }
  });
}

function switchTab(tab: "users" | "logs"): void {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.toggle("active", btn.id === `tab-${tab}`);
  });

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `tab-content-${tab}`);
  });

  // Load data if not loaded yet
  if (tab === "logs" && !$("#logs-table-container")?.hasChildNodes()) {
    loadLogs();
  }
}

// ─── Load Users ──────────────────────────────────────────────────────────────
async function loadUsers(): Promise<void> {
  const container = $("#users-table-container");
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  const users = await authFetch<User[]>("/api/superadmin/users");
  if (!users) {
    container.innerHTML = '<p class="error">Chyba při načítání uživatelů</p>';
    return;
  }

  if (users.length === 0) {
    container.innerHTML = '<p class="empty-state">Žádní uživatelé</p>';
    return;
  }

  const tableHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>E-mail</th>
          <th>Role</th>
          <th>Status</th>
          <th>Vytvořeno</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(
            (user) => `
          <tr>
            <td>
              ${user.username}
              ${user.isSuperAdmin ? ' <span class="badge badge-super">SUPER</span>' : ""}
            </td>
            <td>${user.email || "—"}</td>
            <td><span class="badge badge-${user.role}">${user.role}</span></td>
            <td>
              ${
                user.isBanned
                  ? '<span class="status-banned">🔴 Zabanován</span>'
                  : user.isVerified
                  ? '<span class="status-active">🟢 Aktivní</span>'
                  : '<span class="status-pending">🟡 Neověřen</span>'
              }
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString("cs-CZ")}</td>
            <td>
              ${
                !user.isSuperAdmin
                  ? `<button class="btn btn-small ${user.isBanned ? "btn-success" : "btn-danger"}" 
                       data-user-id="${user.id}" 
                       data-action="toggle-ban">
                       ${user.isBanned ? "Aktivovat" : "Deaktivovat"}
                     </button>`
                  : "—"
              }
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;

  // Bind ban toggle buttons
  container.querySelectorAll("[data-action='toggle-ban']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const userId = (e.target as HTMLElement).dataset.userId;
      if (userId) toggleBanUser(userId);
    });
  });
}

// ─── Toggle Ban User ─────────────────────────────────────────────────────────
async function toggleBanUser(userId: string): Promise<void> {
  const response = await authFetch<{ message: string; isBanned: boolean }>(
    `/api/superadmin/users/${userId}/ban`,
    { method: "PATCH" }
  );

  if (response) {
    showToast(response.message, "success");
    await loadUsers();
  }
}

// ─── Load Logs ───────────────────────────────────────────────────────────────
async function loadLogs(): Promise<void> {
  const container = $("#logs-table-container");
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  const logs = await authFetch<SystemLog[]>("/api/superadmin/logs");
  if (!logs) {
    container.innerHTML = '<p class="error">Chyba při načítání logů</p>';
    return;
  }

  if (logs.length === 0) {
    container.innerHTML = '<p class="empty-state">Žádné chyby (zatím)</p>';
    return;
  }

  const tableHTML = `
    <table class="data-table logs-table">
      <thead>
        <tr>
          <th>Čas</th>
          <th>Úroveň</th>
          <th>Uživatel</th>
          <th>Zpráva</th>
        </tr>
      </thead>
      <tbody>
        ${logs
          .map(
            (log) => `
          <tr class="log-row" data-log-id="${log.id}">
            <td>${new Date(log.createdAt).toLocaleString("cs-CZ")}</td>
            <td><span class="log-level log-level-${log.level.toLowerCase()}">${log.level}</span></td>
            <td>${log.user?.username || log.userId || "—"}</td>
            <td class="log-message">${log.message}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;

  // Bind log row clicks
  container.querySelectorAll(".log-row").forEach((row) => {
    row.addEventListener("click", () => {
      const logId = (row as HTMLElement).dataset.logId;
      const log = logs.find((l) => l.id === logId);
      if (log) showLogDetail(log);
    });
  });
}

// ─── Show Log Detail ─────────────────────────────────────────────────────────
function showLogDetail(log: SystemLog): void {
  const modal = $("#log-detail-modal");
  const content = $("#log-detail-content");
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="log-detail">
      <p><strong>ID:</strong> ${log.id}</p>
      <p><strong>Čas:</strong> ${new Date(log.createdAt).toLocaleString("cs-CZ")}</p>
      <p><strong>Úroveň:</strong> <span class="log-level log-level-${log.level.toLowerCase()}">${log.level}</span></p>
      <p><strong>Uživatel:</strong> ${log.user?.username || log.userId || "Neznámý"}</p>
      <p><strong>Zpráva:</strong> ${log.message}</p>
      <details>
        <summary><strong>Metadata (JSON)</strong></summary>
        <pre>${JSON.stringify(log.metadata, null, 2)}</pre>
      </details>
    </div>
  `;

  modal.style.display = "block";
}

// ─── Add User Modal ──────────────────────────────────────────────────────────
function openAddUserModal(): void {
  const modal = $("#add-user-modal");
  if (!modal) return;
  modal.style.display = "block";
}

function closeModals(): void {
  document.querySelectorAll(".modal").forEach((modal) => {
    (modal as HTMLElement).style.display = "none";
  });
}

async function handleAddUser(e: Event): Promise<void> {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);

  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  const response = await authFetch<{
    message: string;
    user: { id: string; username: string; email: string };
    tempPassword: string;
    verificationToken: string;
  }>("/api/superadmin/users", {
    method: "POST",
    body: JSON.stringify({ username, email, role }),
  });

  if (response) {
    showToast(response.message, "success");
    alert(
      `Dočasné heslo pro ${response.user.username}:\n\n${response.tempPassword}\n\nToken: ${response.verificationToken}\n\n(Uložte si ho, už se nezobrazí!)`
    );
    closeModals();
    form.reset();
    await loadUsers();
  }
}

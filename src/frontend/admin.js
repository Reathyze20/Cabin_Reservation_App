document.addEventListener('DOMContentLoaded', () => {
    // --- Elementy DOM ---
    const appContainer = document.getElementById('app-container');
    const authContainer = document.getElementById('auth-container');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const userListContainer = document.getElementById('user-list-container');
    
    // Modální okno
    const modal = document.getElementById('edit-user-modal');
    const modalUsername = document.getElementById('modal-username');
    const roleSelect = document.getElementById('role-select');
    const saveChangesBtn = document.getElementById('save-user-changes-btn');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const deleteReservationsBtn = document.getElementById('delete-reservations-btn');
    const deleteUserBtn = document.getElementById('delete-user-btn');
    const closeModalBtn = modal.querySelector('.close-button');

    let currentUser = null;
    let users = [];
    let selectedUserId = null;

    // Use shared API helper from common.js
    const apiFetch = Common.authFetch;

    // --- Inicializace ---
    const init = () => {
    const token = Common.token;
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.role !== 'admin') {
                    showAuthError();
                    return;
                }
                currentUser = {
                    id: payload.userId,
                    username: payload.username,
                    role: payload.role,
                };
                showAdminPanel();
                // Safety: ensure modal is hidden on initial load
                if (modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('open');
                }
                loadUsers();
            } catch (e) {
                logout();
            }
        } else {
            logout();
        }
    };
    
    // --- Zobrazení a Autentizace ---
    function showAdminPanel() {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        welcomeMessage.textContent = `Admin: ${currentUser.username}`;
    }

    function showAuthError() {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
    
    function logout() {
        Common.handleSessionExpired();
    }

    // --- Načítání a Vykreslování Uživatelů ---
    async function loadUsers() {
        userListContainer.innerHTML = '<p>Načítám data...</p>';
        const fetchedUsers = await apiFetch('/api/users');
        if (fetchedUsers) {
            users = fetchedUsers;
            renderUserTable();
        } else {
            userListContainer.innerHTML = '<p style="color:red;">Nepodařilo se načíst uživatele.</p>';
        }
    }

    function renderUserTable() {
        userListContainer.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'user-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Jméno</th>
                    <th>Role</th>
                    <th>ID</th>
                    <th>Akce</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td><span class="role-badge role-${user.role || 'user'}">${user.role || 'user'}</span></td>
                <td>${user.id}</td>
                <td>
                    <button class="btn-edit" data-id="${user.id}">Upravit</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        userListContainer.appendChild(table);
    }
    
    // --- Logika Modálního Okna ---
    function openEditModal(userId) {
        selectedUserId = userId;
        const user = users.find(u => u.id === userId);
        if (!user) return;

        modalUsername.textContent = `Úprava uživatele: ${user.username}`;
        roleSelect.value = user.role || 'user';
        // Use .open to show modal (CSS controls visibility)
        modal.classList.remove('hidden');
        modal.classList.add('open');
    }

    function closeEditModal() {
        modal.classList.add('hidden');
        modal.classList.remove('open');
        selectedUserId = null;
    }

    async function handleSaveChanges() {
        if (!selectedUserId) return;
        
        const newRole = roleSelect.value;
        const result = await apiFetch(`/api/users/${selectedUserId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });

        if (result) {
            Common.showToast('Role byla úspěšně změněna.', 'success');
            closeEditModal();
            loadUsers();
        }
    }

    async function handleResetPassword() {
        const newPassword = prompt('Zadejte nové heslo pro uživatele (min. 6 znaků):');
        if (!newPassword || newPassword.length < 6) {
            Common.showToast('Heslo je příliš krátké nebo nebylo zadáno.', 'error');
            return;
        }
        
        const result = await apiFetch(`/api/users/${selectedUserId}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password: newPassword })
        });

        if (result) {
            Common.showToast('Heslo bylo úspěšně resetováno.', 'success');
        }
    }

    async function handleDeleteReservations() {
        if (confirm('Opravdu chcete smazat VŠECHNY rezervace tohoto uživatele?')) {
            const result = await apiFetch(`/api/users/${selectedUserId}/reservations`, {
                method: 'DELETE'
            });
            if (result) {
                Common.showToast('Všechny rezervace uživatele byly smazány.', 'success');
            }
        }
    }

    async function handleDeleteUser() {
        if (confirm('OPRAVDU chcete trvale smazat tohoto uživatele? Tato akce je nevratná!')) {
            const result = await apiFetch(`/api/users/${selectedUserId}`, {
                method: 'DELETE'
            });
            if (result) {
                Common.showToast('Uživatel byl smazán.', 'success');
                closeEditModal();
                loadUsers();
            }
        }
    }

    // --- Event Listeners ---
    logoutBtn.addEventListener('click', logout);
    closeModalBtn.addEventListener('click', closeEditModal);
    // Back to app button (preserve session)
    const backToAppBtn = document.getElementById('back-to-app-btn');
    if (backToAppBtn) {
        backToAppBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal();
    });

    userListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit')) {
            openEditModal(e.target.dataset.id);
        }
    });

    saveChangesBtn.addEventListener('click', handleSaveChanges);
    resetPasswordBtn.addEventListener('click', handleResetPassword);
    deleteReservationsBtn.addEventListener('click', handleDeleteReservations);
    deleteUserBtn.addEventListener('click', handleDeleteUser);

    // --- Spuštění ---
    init();
});

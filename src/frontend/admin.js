document.addEventListener('DOMContentLoaded', async () => {
  const userListDiv = document.getElementById('admin-user-list');
  const logoutBtn = document.getElementById('admin-logout');
  const backBtn = document.getElementById('admin-back');

  // Získání tokenu z localStorage
  const token = localStorage.getItem('authToken');
  if (!token) {
    userListDiv.innerHTML = '<p style="color:red">Nejste přihlášen jako admin.</p>';
    return;
  }

  // Načtení uživatelů
  async function loadUsers() {
    userListDiv.innerHTML = '<p>Načítám uživatele...</p>';
    try {
      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Chyba při načítání uživatelů');
      const users = await response.json();
      renderUserList(users);
    } catch (err) {
      userListDiv.innerHTML = `<p style="color:red">${err.message}</p>`;
    }
  }

  // Render seznamu uživatelů jako moderní tabulku s akcemi
  function renderUserList(users) {
    if (!users.length) {
      userListDiv.innerHTML = '<p>Žádní uživatelé.</p>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'admin-user-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Jméno</th>
          <th>Role</th>
          <th>ID</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.username}</td>
        <td><span class="user-role-label">${user.role || 'user'}</span></td>
        <td>${user.id}</td>
        <td>
          <button data-id="${user.id}" class="detail-user-btn">Detail</button>
          <button data-id="${user.id}" class="delete-user-btn">Smazat</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    userListDiv.innerHTML = '';
    userListDiv.appendChild(table);
  }

  // Detail uživatele (zobrazí info, možnost změnit roli přes select, reset hesla, počet rezervací)
  userListDiv.addEventListener('click', async (e) => {
    if (e.target.classList.contains('detail-user-btn')) {
      const userId = e.target.getAttribute('data-id');
      try {
        const response = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const users = await response.json();
        const user = users.find(u => u.id === userId);
        if (!user) return;
        // Získání počtu rezervací
        let reservationCount = 0;
        try {
          const resResp = await fetch('/api/reservations', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resResp.ok) {
            const reservations = await resResp.json();
            reservationCount = reservations.filter(r => r.userId === userId).length;
          }
        } catch {}
        const detailDiv = document.getElementById('admin-user-detail');
        detailDiv.style.display = 'block';
        detailDiv.innerHTML = `
          <h2>Detail uživatele</h2>
          <p><strong>Jméno:</strong> ${user.username}</p>
          <p><strong>ID:</strong> ${user.id}</p>
          <p><strong>Role:</strong> <select id="role-select">
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
            <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
            <option value="guest" ${user.role === 'guest' ? 'selected' : ''}>guest</option>
          </select></p>
          <p><strong>Počet rezervací:</strong> ${reservationCount}</p>
          <button id="save-role-btn">Uložit roli</button>
          <button id="reset-password-btn">Resetovat heslo</button>
          <button id="delete-all-reservations-btn">Smazat všechny rezervace</button>
          <button id="close-detail-btn">Zavřít detail</button>
        `;
        // Uložení nové role
        document.getElementById('save-role-btn').onclick = async () => {
          const newRole = document.getElementById('role-select').value;
          try {
            const resp = await fetch(`/api/users/${userId}/role`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ role: newRole })
            });
            if (resp.ok) {
              loadUsers();
              alert('Role změněna.');
            } else {
              alert('Chyba při změně role.');
            }
          } catch {}
        };
        // Reset hesla
        document.getElementById('reset-password-btn').onclick = async () => {
          const newPassword = prompt('Zadejte nové heslo pro uživatele:');
          if (!newPassword || newPassword.length < 6) {
            alert('Heslo musí mít alespoň 6 znaků.');
            return;
          }
          try {
            const resp = await fetch(`/api/users/${userId}/password`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ password: newPassword })
            });
            if (resp.ok) {
              alert('Heslo bylo změněno.');
            } else {
              alert('Chyba při změně hesla.');
            }
          } catch {}
        };
        // Smazání všech rezervací uživatele
        document.getElementById('delete-all-reservations-btn').onclick = async () => {
          if (confirm('Opravdu chcete smazat všechny rezervace tohoto uživatele?')) {
            try {
              const resp = await fetch(`/api/users/${userId}/reservations`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              const result = await resp.json();
              if (resp.ok) {
                alert(result.message);
                detailDiv.style.display = 'none';
              } else {
                alert(result.message || 'Chyba při mazání rezervací.');
              }
            } catch {}
          }
        };
        // Zavřít detail
        document.getElementById('close-detail-btn').onclick = () => {
          detailDiv.style.display = 'none';
        };
      } catch {}
    }
    // Smazání uživatele
    if (e.target.classList.contains('delete-user-btn')) {
      const userId = e.target.getAttribute('data-id');
      if (confirm('Opravdu chcete smazat tohoto uživatele?')) {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || 'Chyba při mazání uživatele');
          loadUsers();
        } catch (err) {
          alert('Chyba: ' + err.message);
        }
      }
    }
  });

  // Odhlášení
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
  });

  // Návrat do hlavní aplikace
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  // Načti uživatele při načtení stránky
  loadUsers();
});

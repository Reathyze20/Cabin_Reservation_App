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

  // Render seznamu uživatelů
  function renderUserList(users) {
    if (!users.length) {
      userListDiv.innerHTML = '<p>Žádní uživatelé.</p>';
      return;
    }
    const list = document.createElement('ul');
    users.forEach(user => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${user.username}</strong> (${user.role || 'user'}) <button data-id="${user.id}" class="delete-user-btn">Smazat</button>`;
      list.appendChild(li);
    });
    userListDiv.innerHTML = '';
    userListDiv.appendChild(list);
  }

  // Smazání uživatele
  userListDiv.addEventListener('click', async (e) => {
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

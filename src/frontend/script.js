// --- Globální proměnné a stav aplikace ---
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let reservations = [];
let shoppingList = [];
let allUsers = [];
let activeSplitItemId = null; // ID položky pro rozdělení ceny

// --- Elementy DOM ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');
const adminPanelBtn = document.getElementById('admin-panel-btn');
const monthYearDisplay = document.getElementById('month-year');
const calendarGrid = document.querySelector('.calendar-grid');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const reservationForm = document.getElementById('reservation-form');
const reservationsListDiv = document.getElementById('reservations-list');
const shoppingListDiv = document.getElementById('shopping-list');
const addItemForm = document.getElementById('add-item-form');
const splitPriceModal = document.getElementById('split-price-modal');
const closeModalBtn = document.querySelector('.close-button');
const saveSplitBtn = document.getElementById('save-split-btn');
const splitUserListDiv = document.getElementById('split-user-list');


// --- Funkce pro API volání ---
const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) { // Neautorizováno
            logout();
            return null;
        }
        if (!response.ok) {
            const errorData = await response.json();
            alert(`Chyba: ${errorData.message || response.statusText}`);
            return null;
        }
        // Některé odpovědi nemusí mít tělo (např. 204 No Content)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return response;

    } catch (error) {
        console.error('Chyba API volání:', error);
        alert('Došlo k chybě při komunikaci se serverem.');
        return null;
    }
};

// --- Inicializace aplikace ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Zde dekódujeme token, abychom získali uživatelská data bez dalšího volání na server
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = {
                id: payload.userId,
                username: payload.username,
                role: payload.role,
                color: payload.color
            };
            showApp();
            initializeApp();
        } catch (e) {
            console.error("Chyba při dekódování tokenu:", e);
            logout(); // Pokud je token neplatný, odhlásíme uživatele
        }
    } else {
        showAuth();
    }
    setupEventListeners();
});

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthViews(); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); toggleAuthViews(); });
    logoutBtn.addEventListener('click', logout);
    adminPanelBtn.addEventListener('click', () => { window.location.href = '/admin.html'; });

    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    reservationForm.addEventListener('submit', createReservation);
    addItemForm.addEventListener('submit', addShoppingItem);

    closeModalBtn.addEventListener('click', () => splitPriceModal.classList.add('hidden'));
    saveSplitBtn.addEventListener('click', handleSaveSplit);
    window.addEventListener('click', (event) => {
        if (event.target === splitPriceModal) {
            splitPriceModal.classList.add('hidden');
        }
    });
}

async function initializeApp() {
    if (!currentUser) return;
    welcomeMessage.textContent = `Vítej, ${currentUser.username}!`;
    if (currentUser.role === 'admin') {
        adminPanelBtn.classList.remove('hidden');
    }
    
    // Načtení všech dat
    await Promise.all([
        fetchReservations(),
        fetchShoppingList(),
        fetchAllUsers()
    ]);
    
    renderCalendar();
}

// --- Správa zobrazení ---
function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

function showAuth() {
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
}

function toggleAuthViews() {
    loginView.classList.toggle('hidden');
    registerView.classList.toggle('hidden');
}

// --- Autentizace ---
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        currentUser = { id: data.userId, username: data.username, role: data.role, color: data.color };
        showApp();
        initializeApp();
    } else {
        const error = await response.json();
        alert(`Přihlášení selhalo: ${error.message}`);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const color = document.getElementById('register-color').value;

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, color })
    });

    if (response.ok) {
        const data = await response.json();
        alert(data.message);
        toggleAuthViews();
        loginForm.reset();
        registerForm.reset();
    } else {
        const error = await response.json();
        alert(`Registrace selhala: ${error.message}`);
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    showAuth();
}


// --- Kalendář a Rezervace ---
function renderCalendar() {
    calendarGrid.innerHTML = '';
    const date = new Date(currentYear, currentMonth, 1);
    monthYearDisplay.textContent = date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

    const firstDayIndex = (date.getDay() + 6) % 7;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = firstDayIndex; i > 0; i--) {
        calendarGrid.innerHTML += `<div class="calendar-day other-month">${prevLastDay - i + 1}</div>`;
    }

    for (let i = 1; i <= lastDay; i++) {
        const dayDate = new Date(currentYear, currentMonth, i);
        const dayString = dayDate.toISOString().split('T')[0];
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = i;
        dayDiv.dataset.date = dayString;

        const today = new Date();
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        // Zvýraznění dnů s rezervací
        const reservationsForDay = reservations.filter(r => {
            const from = new Date(r.from);
            from.setHours(0,0,0,0);
            const to = new Date(r.to);
            to.setHours(23,59,59,999);
            return dayDate >= from && dayDate <= to;
        });

        if (reservationsForDay.length > 0) {
            dayDiv.classList.add('day-has-reservation');
            const primary = reservationsForDay.some(r => r.status !== 'backup');
            const backup = reservationsForDay.some(r => r.status === 'backup');
            
            if (primary && backup) {
                 dayDiv.classList.add('day-has-backup');
            }
            
            reservationsForDay.forEach(res => {
                const dot = document.createElement('div');
                dot.className = 'reservation-dot';
                dot.style.backgroundColor = res.userColor || '#808080';
                dayDiv.appendChild(dot);
            });
        }

        calendarGrid.appendChild(dayDiv);
    }

    // Doplnění dnů do celých 6 týdnů pro konzistentní layout
    const totalDays = calendarGrid.children.length;
    const nextDays = (7 - (totalDays % 7)) % 7;
    for (let i = 1; i <= nextDays; i++) {
        calendarGrid.innerHTML += `<div class="calendar-day other-month">${i}</div>`;
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

async function fetchReservations() {
    const data = await apiFetch('/api/reservations');
    if (data) {
        reservations = data;
        renderReservationsList();
        renderCalendar();
    }
}

async function createReservation(e) {
    e.preventDefault();
    const from = document.getElementById('reservation-from').value;
    const to = document.getElementById('reservation-to').value;
    const purpose = document.getElementById('reservation-purpose').value;
    const notes = document.getElementById('reservation-notes').value;

    if (new Date(to) < new Date(from)) {
        alert('Datum "do" nesmí být před datem "od".');
        return;
    }

    const newReservation = await apiFetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ from, to, purpose, notes }),
    });

    if (newReservation) {
        alert(newReservation.status === 'backup' ? 'Vaše rezervace byla vytvořena jako záložní, protože termín je již obsazen.' : 'Rezervace úspěšně vytvořena!');
        reservationForm.reset();
        await fetchReservations();
    }
}

function renderReservationsList() {
    reservationsListDiv.innerHTML = '';
    if (reservations.length === 0) {
        reservationsListDiv.innerHTML = '<p>Zatím zde nejsou žádné rezervace.</p>';
        return;
    }

    const sortedReservations = [...reservations].sort((a, b) => new Date(a.from) - new Date(b.from));

    sortedReservations.forEach(res => {
        const item = document.createElement('div');
        item.className = 'reservation-item';

        const fromDate = new Date(res.from).toLocaleDateString('cs-CZ');
        const toDate = new Date(res.to).toLocaleDateString('cs-CZ');

        let statusText = '';
        let statusClass = '';
        if (res.status === 'backup') {
            statusText = 'Záložní';
            statusClass = 'status-backup';
        } else {
            statusText = 'Potvrzeno';
            statusClass = 'status-confirmed';
        }

        item.innerHTML = `
            <div class="reservation-info">
                <div class="reservation-color-bar" style="background-color: ${res.userColor || '#808080'}"></div>
                <div class="reservation-details">
                    <p><strong>${res.username}</strong></p>
                    <p>${fromDate} - ${toDate}</p>
                    <p><small>${res.purpose || 'Bez účelu'}</small></p>
                </div>
            </div>
            <div class="reservation-actions">
                 <span class="reservation-status-badge ${statusClass}">${statusText}</span>
                 ${(currentUser.id === res.userId || currentUser.role === 'admin') ? `<button class="delete-btn" onclick="deleteReservation('${res.id}')"><i class="fas fa-trash-alt"></i></button>` : ''}
            </div>
        `;
        reservationsListDiv.appendChild(item);
    });
}

async function deleteReservation(id) {
    if (confirm('Opravdu si přejete smazat tuto rezervaci?')) {
        const result = await apiFetch('/api/reservations/delete', {
            method: 'POST',
            body: JSON.stringify({ id }),
        });
        if (result) {
            await fetchReservations();
        }
    }
}


// --- Nákupní seznam ---
async function fetchShoppingList() {
    const data = await apiFetch('/api/shopping-list');
    if (data) {
        shoppingList = data;
        renderShoppingList();
    }
}

async function addShoppingItem(e) {
    e.preventDefault();
    const nameInput = document.getElementById('item-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const newItem = await apiFetch('/api/shopping-list', {
        method: 'POST',
        body: JSON.stringify({ name }),
    });

    if (newItem) {
        nameInput.value = '';
        await fetchShoppingList();
    }
}

function renderShoppingList() {
    shoppingListDiv.innerHTML = '';
    if (shoppingList.length === 0) {
        shoppingListDiv.innerHTML = '<p>Seznam je prázdný.</p>';
        return;
    }

    const sortedList = [...shoppingList].sort((a,b) => (a.purchased === b.purchased) ? 0 : a.purchased ? 1 : -1);

    sortedList.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `shopping-list-item ${item.purchased ? 'purchased' : ''}`;
        itemDiv.dataset.id = item.id;
        
        const createdAt = new Date(item.createdAt).toLocaleDateString('cs-CZ');
        let priceInfoHTML = '';
        if (item.purchased && item.price) {
            let splitText = '';
            if (item.splitWith && item.splitWith.length > 0) {
                 const userNames = item.splitWith.map(userId => allUsers.find(u => u.id === userId)?.username || 'Neznámý');
                 splitText = ` (rozděleno s: ${userNames.join(', ')})`;
            }
            priceInfoHTML = `<div class="item-price-info">Cena: ${item.price} Kč (Zaplatil: ${item.purchasedBy})${splitText}</div>`;
        }
        
        itemDiv.innerHTML = `
            <i class="item-icon ${item.icon || 'fas fa-shopping-basket'}"></i>
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-meta">Přidal: ${item.addedBy} (${createdAt})</div>
                ${priceInfoHTML}
            </div>
            <input type="checkbox" ${item.purchased ? 'checked' : ''} onchange="togglePurchase('${item.id}', this.checked)">
             ${(currentUser.role === 'admin' || currentUser.id === item.addedById) ? `<button class="delete-btn" onclick="deleteShoppingItem('${item.id}')"><i class="fas fa-trash-alt"></i></button>` : ''}
        `;
        shoppingListDiv.appendChild(itemDiv);

        if (item.purchased && item.purchasedById === currentUser.id && !item.splitWith?.length) {
             const splitBtn = document.createElement('button');
             splitBtn.textContent = 'Rozdělit';
             splitBtn.onclick = () => openSplitPriceModal(item.id);
             itemDiv.querySelector('.item-details').appendChild(splitBtn);
        }
    });
}

async function togglePurchase(id, isChecked) {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;

    let price = null;
    if (isChecked) {
        const priceString = prompt('Zadejte cenu položky (nepovinné):');
        if (priceString) {
            price = parseFloat(priceString);
            if (isNaN(price)) {
                alert('Neplatná cena.');
                const checkbox = document.querySelector(`.shopping-list-item[data-id="${id}"] input[type="checkbox"]`);
                checkbox.checked = false;
                return;
            }
        }
    }

    const updatedItem = await apiFetch(`/api/shopping-list/${id}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({ purchased: isChecked, price: price }),
    });

    if (updatedItem) {
        await fetchShoppingList();
    }
}

async function deleteShoppingItem(id) {
     if (confirm('Opravdu chcete smazat tuto položku?')) {
        const response = await apiFetch(`/api/shopping-list/${id}`, {
            method: 'DELETE',
        });
        if (response) { // Pokud je odpověď OK (i bez těla)
            await fetchShoppingList();
        }
    }
}

async function fetchAllUsers() {
    const data = await apiFetch('/api/users');
    if (data) {
        allUsers = data;
    }
}

function openSplitPriceModal(itemId) {
    activeSplitItemId = itemId;
    const item = shoppingList.find(i => i.id === itemId);
    if (!item) return;

    splitUserListDiv.innerHTML = '';
    // Nezobrazíme aktuálního uživatele v seznamu pro rozdělení
    const otherUsers = allUsers.filter(u => u.id !== currentUser.id);

    otherUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-split-item';
        userDiv.innerHTML = `
            <input type="checkbox" id="user-${user.id}" data-userid="${user.id}">
            <label for="user-${user.id}">${user.username}</label>
        `;
        splitUserListDiv.appendChild(userDiv);
    });

    splitPriceModal.classList.remove('hidden');
}

async function handleSaveSplit() {
    if (!activeSplitItemId) return;

    const selectedUserIds = Array.from(splitUserListDiv.querySelectorAll('input:checked'))
                                 .map(input => input.dataset.userid);

    const item = shoppingList.find(i => i.id === activeSplitItemId);

    const updatedItem = await apiFetch(`/api/shopping-list/${activeSplitItemId}/purchase`, {
        method: 'PUT',
        body: JSON.stringify({
            purchased: true,
            price: item.price,
            splitWith: selectedUserIds
        }),
    });

    if (updatedItem) {
        splitPriceModal.classList.add('hidden');
        await fetchShoppingList();
    }
}


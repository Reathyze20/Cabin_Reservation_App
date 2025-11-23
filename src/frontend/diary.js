document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");
    const loggedInUsernameElement = document.getElementById("logged-in-username");
    const logoutButton = document.getElementById("logout-button");

    // Views
    const foldersView = document.getElementById("diary-folders-view");
    const entriesView = document.getElementById("diary-entries-view");
    const foldersGrid = document.getElementById("diary-folders-grid");
    const entriesList = document.getElementById("diary-entries-list");
    const currentDiaryTitle = document.getElementById("current-diary-title");

    // Buttons
    const createFolderBtn = document.getElementById("create-diary-folder-btn");
    const backToFoldersBtn = document.getElementById("back-to-diary-folders-btn");
    const deleteFolderBtn = document.getElementById("delete-diary-folder-btn");
    const addEntryBtn = document.getElementById("add-entry-btn");

    // Modals
    const createFolderModal = document.getElementById("create-diary-folder-modal");
    const createFolderForm = document.getElementById("create-diary-folder-form");
    const folderNameInput = document.getElementById("diary-folder-name-input");

    const createEntryModal = document.getElementById("create-entry-modal");
    const createEntryForm = document.getElementById("create-entry-form");
    const entryDateInput = document.getElementById("entry-date-input");
    const entryContentInput = document.getElementById("entry-content-input");

    // --- State ---
    const backendUrl = "";
    let currentFolderId = null;
    let currentUser = null;

    // --- Auth Check ---
    const loggedInUsername = localStorage.getItem("username");
    const userRole = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("authToken");

    if (loggedInUsername && token) {
        currentUser = { username: loggedInUsername, role: userRole, id: userId };
        appContainer.classList.remove("hidden");
        authContainer.classList.add("hidden");
        if (loggedInUsernameElement) loggedInUsernameElement.textContent = loggedInUsername;
        loadFolders();
    } else {
        appContainer.classList.add("hidden");
        authContainer.classList.remove("hidden");
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "index.html";
        });
    }

    // --- API Helpers ---
    async function apiFetch(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };
        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401) {
                alert("Sezení vypršelo.");
                localStorage.clear();
                window.location.href = "index.html";
                return null;
            }
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || "Chyba serveru");
            }
            return response.json();
        } catch (error) {
            console.error(error);
            alert(error.message);
            return null;
        }
    }

    // --- Logic: Folders ---
    async function loadFolders() {
        const folders = await apiFetch(`${backendUrl}/api/diary/folders`);
        if (folders) renderFolders(folders);
    }

    function renderFolders(folders) {
        foldersGrid.innerHTML = '';
        if (folders.length === 0) {
            foldersGrid.innerHTML = '<p class="empty-state">Deník je prázdný. Založte první období!</p>';
            return;
        }
        folders.forEach(folder => {
            const el = document.createElement('div');
            el.className = 'folder-card diary-folder';
            el.onclick = () => openFolder(folder.id, folder.name);
            el.innerHTML = `
                <div class="folder-icon" style="color: #60a5fa;"><i class="fas fa-book"></i></div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <span class="folder-date">Vytvořil: ${folder.createdBy || '?'}</span>
                </div>
            `;
            foldersGrid.appendChild(el);
        });
    }

    createFolderBtn.addEventListener('click', () => {
        createFolderModal.style.display = 'flex';
        folderNameInput.focus();
    });

    createFolderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = folderNameInput.value.trim();
        if (!name) return;
        const result = await apiFetch(`${backendUrl}/api/diary/folders`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        if (result) {
            createFolderModal.style.display = 'none';
            folderNameInput.value = '';
            loadFolders();
        }
    });

    deleteFolderBtn.addEventListener('click', async () => {
        if (!currentFolderId) return;
        if (!confirm("Opravdu smazat toto období a všechny zápisy v něm?")) return;
        
        const result = await apiFetch(`${backendUrl}/api/diary/folders/${currentFolderId}`, { method: 'DELETE' });
        if (result) {
            backToFolders();
            loadFolders();
        }
    });

    // --- Logic: Entries ---
    function openFolder(id, name) {
        currentFolderId = id;
        currentDiaryTitle.textContent = name;
        foldersView.style.display = 'none';
        entriesView.style.display = 'flex';
        loadEntries(id);
    }

    function backToFolders() {
        entriesView.style.display = 'none';
        foldersView.style.display = 'flex';
        currentFolderId = null;
    }
    backToFoldersBtn.addEventListener('click', backToFolders);

    async function loadEntries(folderId) {
        const entries = await apiFetch(`${backendUrl}/api/diary/entries?folderId=${folderId}`);
        if (entries) renderEntries(entries);
    }

    function renderEntries(entries) {
        entriesList.innerHTML = '';
        if (entries.length === 0) {
            entriesList.innerHTML = '<p class="empty-state">Žádné zápisky. Co jste dnes zažili?</p>';
            return;
        }

        entries.forEach(entry => {
            const el = document.createElement('div');
            el.className = 'diary-entry-card';
            
            // Format Date
            const dateObj = new Date(entry.date);
            const dateStr = dateObj.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            const canDelete = (entry.authorId === userId) || (userRole === 'admin');
            const deleteBtn = canDelete ? `<button class="delete-entry-btn" title="Smazat"><i class="fas fa-trash"></i></button>` : '';

            el.innerHTML = `
                <div class="diary-date-badge">
                    <span class="day">${dateObj.getDate()}</span>
                    <span class="month">${dateObj.toLocaleDateString('cs-CZ', { month: 'short' })}</span>
                </div>
                <div class="diary-content-wrap">
                    <div class="diary-header-row">
                        <h4>${dateStr}</h4>
                        ${deleteBtn}
                    </div>
                    <div class="diary-text">${escapeHtml(entry.content).replace(/\n/g, '<br>')}</div>
                    <div class="diary-meta">Zapsal: <strong>${entry.author}</strong></div>
                </div>
            `;
            
            if (canDelete) {
                el.querySelector('.delete-entry-btn').onclick = () => deleteEntry(entry.id);
            }

            entriesList.appendChild(el);
        });
    }

    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    addEntryBtn.addEventListener('click', () => {
        createEntryModal.style.display = 'flex';
        // Set today as default
        entryDateInput.valueAsDate = new Date();
        entryContentInput.value = '';
        entryContentInput.focus();
    });

    createEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentFolderId) return;

        const result = await apiFetch(`${backendUrl}/api/diary/entries`, {
            method: 'POST',
            body: JSON.stringify({
                folderId: currentFolderId,
                date: entryDateInput.value,
                content: entryContentInput.value
            })
        });

        if (result) {
            createEntryModal.style.display = 'none';
            loadEntries(currentFolderId);
        }
    });

    async function deleteEntry(id) {
        if (!confirm("Smazat tento zápis?")) return;
        const result = await apiFetch(`${backendUrl}/api/diary/entries/${id}`, { method: 'DELETE' });
        if (result) {
            loadEntries(currentFolderId);
        }
    }

    document.querySelectorAll('.modal-close-button').forEach(btn => {
        btn.addEventListener('click', () => { btn.closest('.modal-overlay').style.display = 'none'; });
    });
});
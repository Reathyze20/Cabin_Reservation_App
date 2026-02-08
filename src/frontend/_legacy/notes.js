document.addEventListener("DOMContentLoaded", () => {
    // 1. Elementy DOM
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");
    const loggedInUsernameElement = document.getElementById("logged-in-username");
    const logoutButton = document.getElementById("logout-button");
    const notesList = document.getElementById("notes-list");
    const addNoteForm = document.getElementById("add-note-form");
    const noteMessageInput = document.getElementById("note-message-input");
    
    // Filtry
    const authorFilterSelect = document.getElementById("author-filter");
    const dateFromFilter = document.getElementById("date-from-filter");
    const dateToFilter = document.getElementById("date-to-filter");
    const resetFiltersBtn = document.getElementById("reset-filters-btn");

    // Definice Backend URL
    const backendUrl = "";

    // Globální proměnná pro uložení všech dat
    let allNotesData = [];

    // 2. Kontrola přihlášení — use Common module
    if (Common.checkAuth(appContainer, authContainer, loggedInUsernameElement)) {
        loadNotes();
    }
    Common.setupLogout(logoutButton);

    // --- Logika Vzkazů ---

    async function loadNotes() {
        if (notesList) notesList.innerHTML = `<div class="spinner-container" style="text-align:center; padding:20px;"><div class="spinner"></div></div>`;
        
        try {
            const data = await Common.authFetch(`${backendUrl}/api/notes`);
            if (!data) throw new Error('Nepodařilo se načíst vzkazy.');
            
            allNotesData = data;
            
            // Seřazení od nejnovějších
            allNotesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Naplnění filtru autorů
            populateAuthorFilter(allNotesData);
            
            // Aplikace filtrů (zobrazí vše, pokud jsou filtry prázdné)
            applyFilters();

        } catch (error) {
            console.error("Chyba:", error);
            if (notesList) notesList.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        }
    }

    function populateAuthorFilter(notes) {
        if (!authorFilterSelect) return;

        const currentSelection = authorFilterSelect.value;
        const authors = [...new Set(notes.map(note => note.username))].sort();

        authorFilterSelect.innerHTML = '<option value="">Všichni autoři</option>';

        authors.forEach(author => {
            const option = document.createElement("option");
            option.value = author;
            option.textContent = author;
            authorFilterSelect.appendChild(option);
        });

        if (currentSelection && authors.includes(currentSelection)) {
            authorFilterSelect.value = currentSelection;
        }
    }

    // --- Hlavní funkce pro filtrování ---
    function applyFilters() {
        if (!allNotesData) return;

        const authorValue = authorFilterSelect ? authorFilterSelect.value : "";
        const dateFromValue = dateFromFilter ? dateFromFilter.value : ""; // YYYY-MM-DD
        const dateToValue = dateToFilter ? dateToFilter.value : "";     // YYYY-MM-DD

        const filteredNotes = allNotesData.filter(note => {
            // 1. Filtr podle autora
            if (authorValue && note.username !== authorValue) {
                return false;
            }

            // Příprava data vzkazu (pouze datum bez času pro porovnání)
            const noteDateObj = new Date(note.createdAt);
            // Převedeme na string YYYY-MM-DD pro snadné porovnání
            const noteDateStr = noteDateObj.toISOString().split('T')[0];

            // 2. Filtr Datum OD
            if (dateFromValue && noteDateStr < dateFromValue) {
                return false;
            }

            // 3. Filtr Datum DO
            if (dateToValue && noteDateStr > dateToValue) {
                return false;
            }

            return true;
        });

        renderNotes(filteredNotes);
    }

    // Listenery pro změnu filtrů
    if (authorFilterSelect) authorFilterSelect.addEventListener("change", applyFilters);
    if (dateFromFilter) dateFromFilter.addEventListener("change", applyFilters);
    if (dateToFilter) dateToFilter.addEventListener("change", applyFilters);

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener("click", () => {
            if (authorFilterSelect) authorFilterSelect.value = "";
            if (dateFromFilter) dateFromFilter.value = "";
            if (dateToFilter) dateToFilter.value = "";
            applyFilters();
        });
    }

    function renderNotes(notes) {
        if (!notesList) return;
        
        notesList.innerHTML = '';
        if (notes.length === 0) {
            notesList.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;"><i>Žádné vzkazy neodpovídají filtrům.</i></p>';
            return;
        }

        const loggedInUserId = Common.userId;
        const isAdmin = Common.role === 'admin';

        notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';
            noteEl.dataset.id = note.id;

            const canDelete = isAdmin || (note.userId === loggedInUserId);
            const deleteBtn = canDelete ? `<button class="delete-note-btn" title="Smazat vzkaz"><i class="fas fa-times"></i></button>` : '';

            const date = new Date(note.createdAt);
            const formattedDate = `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()} v ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

            noteEl.innerHTML = `
                ${deleteBtn}
                <div class="note-header">
                    <span class="note-author" style="font-weight:bold; color:#d97706;">${note.username}</span>
                    <span class="note-date" style="font-size:0.85em; color:#777; margin-left:8px;">${formattedDate}</span>
                </div>
                <p class="note-content">${note.message.replace(/\n/g, '<br>')}</p>
            `;
            notesList.appendChild(noteEl);
        });
    }

    // Přidání vzkazu
    if(addNoteForm) {
        addNoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = noteMessageInput.value.trim();
            if (!message) return;

            try {
                const result = await Common.authFetch(`${backendUrl}/api/notes`, {
                    method: 'POST',
                    body: JSON.stringify({ message })
                });
                if (!result) throw new Error('Chyba při přidávání vzkazu.');

                noteMessageInput.value = '';
                
                // Reset filtrů, aby uživatel viděl svůj nový příspěvek
                if (authorFilterSelect) authorFilterSelect.value = "";
                if (dateFromFilter) dateFromFilter.value = "";
                if (dateToFilter) dateToFilter.value = "";
                
                await loadNotes();
            } catch (error) {
                Common.showToast(error.message, 'error');
            }
        });
    }

    // Mazání vzkazů
    if (notesList) {
        notesList.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-note-btn');
            if (!deleteBtn) return;

            const noteItem = deleteBtn.closest('.note-item');
            const noteId = noteItem.dataset.id;

            if (confirm('Opravdu chcete smazat tento vzkaz?')) {
                try {
                    const result = await Common.authFetch(`${backendUrl}/api/notes/${noteId}`, {
                        method: 'DELETE'
                    });
                    if (!result) throw new Error('Chyba při mazání vzkazu.');
                    await loadNotes();
                } catch (error) {
                    Common.showToast(error.message, 'error');
                }
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    // 1. Elementy DOM
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");
    const loggedInUsernameElement = document.getElementById("logged-in-username");
    const logoutButton = document.getElementById("logout-button");
    const notesList = document.getElementById("notes-list");
    const addNoteForm = document.getElementById("add-note-form");
    const noteMessageInput = document.getElementById("note-message-input");
    const authorFilterSelect = document.getElementById("author-filter");

    // Definice Backend URL
    const backendUrl = "";

    // Globální proměnná pro uložení dat (pro klientské filtrování)
    let allNotesData = [];

    // 2. Kontrola přihlášení
    const loggedInUsername = localStorage.getItem("username");

    if (loggedInUsername) {
        // Uživatel JE přihlášen
        if (appContainer) appContainer.classList.remove("hidden");
        if (authContainer) authContainer.classList.add("hidden");
        
        // Vyplnění jména
        if (loggedInUsernameElement) {
            loggedInUsernameElement.textContent = loggedInUsername;
        }

        // Načtení vzkazů
        loadNotes();

    } else {
        // Uživatel NENÍ přihlášen
        if (appContainer) appContainer.classList.add("hidden");
        if (authContainer) authContainer.classList.remove("hidden");
    }

    // 3. Funkčnost odhlášení
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "index.html";
        });
    }

    // --- Logika Vzkazů ---

    async function loadNotes() {
        if (notesList) notesList.innerHTML = `<div class="spinner-container" style="text-align:center; padding:20px;"><div class="spinner"></div></div>`;
        
        const token = localStorage.getItem("authToken");
        try {
            const response = await fetch(`${backendUrl}/api/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Nepodařilo se načíst vzkazy.');
            
            // Uložení dat
            allNotesData = await response.json();
            
            // Seřazení od nejnovějších
            allNotesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Naplnění filtru a vykreslení
            populateAuthorFilter(allNotesData);
            
            // Zkontrolujeme, jestli uživatel už něco vybral (např. před reloadem), jinak zobrazíme vše
            const currentFilter = authorFilterSelect ? authorFilterSelect.value : "";
            if (currentFilter) {
                const filtered = allNotesData.filter(n => n.username === currentFilter);
                renderNotes(filtered);
            } else {
                renderNotes(allNotesData);
            }

        } catch (error) {
            console.error("Chyba:", error);
            if (notesList) notesList.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        }
    }

    function populateAuthorFilter(notes) {
        if (!authorFilterSelect) return;

        const currentSelection = authorFilterSelect.value;
        
        // Získání unikátních jmen
        const authors = [...new Set(notes.map(note => note.username))].sort();

        // Reset možností - vždy začínáme s "Všichni"
        authorFilterSelect.innerHTML = '<option value="">Všichni autoři</option>';

        authors.forEach(author => {
            const option = document.createElement("option");
            option.value = author;
            option.textContent = author;
            authorFilterSelect.appendChild(option);
        });

        // Pokud předchozí výběr stále existuje v datech, obnovíme ho
        if (currentSelection && authors.includes(currentSelection)) {
            authorFilterSelect.value = currentSelection;
        }
    }

    if (authorFilterSelect) {
        authorFilterSelect.addEventListener("change", (e) => {
            const selectedAuthor = e.target.value;
            if (selectedAuthor === "") {
                renderNotes(allNotesData);
            } else {
                const filteredNotes = allNotesData.filter(note => note.username === selectedAuthor);
                renderNotes(filteredNotes);
            }
        });
    }

    function renderNotes(notes) {
        if (!notesList) return;
        
        notesList.innerHTML = '';
        if (notes.length === 0) {
            notesList.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;"><i>Žádné vzkazy k zobrazení.</i></p>';
            return;
        }

        const loggedInUserId = localStorage.getItem('userId');
        const isAdmin = localStorage.getItem('role') === 'admin';

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
                <div class="note-header" style="margin-bottom: 5px;">
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

            const token = localStorage.getItem("authToken");
            try {
                const response = await fetch(`${backendUrl}/api/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ message })
                });
                if (!response.ok) throw new Error('Chyba při přidávání vzkazu.');

                noteMessageInput.value = '';
                
                // Reset filtru na "Všichni", aby uživatel viděl svůj nový příspěvek
                if(authorFilterSelect) authorFilterSelect.value = "";
                
                await loadNotes();
            } catch (error) {
                alert(error.message);
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
                const token = localStorage.getItem("authToken");
                try {
                    const response = await fetch(`${backendUrl}/api/notes/${noteId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Chyba při mazání vzkazu.');
                    await loadNotes();
                } catch (error) {
                    alert(error.message);
                }
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    // 1. Elementy DOM
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");
    const loggedInUsernameElement = document.getElementById("logged-in-username");
    const logoutButton = document.getElementById("logout-button");
    const notesList = document.getElementById("notes-list");
    const addNoteForm = document.getElementById("add-note-form");
    const noteMessageInput = document.getElementById("note-message-input");

    // Definice Backend URL (stejně jako v script.js)
    const backendUrl = "";

    // 2. Kontrola přihlášení a helpery
    function getToken() {
        return localStorage.getItem("authToken");
    }

    const loggedInUsername = localStorage.getItem("username");

    if (loggedInUsername) {
        // Uživatel JE přihlášen
        if (appContainer) appContainer.classList.remove("hidden");
        if (authContainer) authContainer.classList.add("hidden");
        
        // Vyplnění jména v hlavičce
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
            localStorage.clear(); // Kompletní vymazání stejně jako v script.js
            window.location.href = "index.html";
        });
    }

    // --- Logika Vzkazů (Přeneseno ze script.js) ---

    async function loadNotes() {
        notesList.innerHTML = `<div class="spinner-container" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>`;
        const token = getToken();
        try {
            const response = await fetch(`${backendUrl}/api/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Nepodařilo se načíst vzkazy.');
            const notes = await response.json();
            renderNotes(notes);
        } catch (error) {
            console.error("Chyba při načítání vzkazů:", error);
            notesList.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        }
    }

    function renderNotes(notes) {
        notesList.innerHTML = '';
        if (notes.length === 0) {
            notesList.innerHTML = '<p style="text-align:center; color:#666;"><i>Zatím tu nejsou žádné vzkazy.</i></p>';
            return;
        }

        notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
                <div class="note-header">
                    <span class="note-author"><strong>${note.username}</strong></span>
                    <span class="note-date">${formattedDate}</span>
                </div>
                <p class="note-content">${note.message.replace(/\n/g, '<br>')}</p>
            `;
            notesList.appendChild(noteEl);
        });
    }

    // 4. Přidávání vzkazů
    if(addNoteForm) {
        addNoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = noteMessageInput.value.trim();
            if (!message) return;

            const token = getToken();
            try {
                const response = await fetch(`${backendUrl}/api/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ message })
                });
                if (!response.ok) throw new Error('Chyba při přidávání vzkazu.');

                noteMessageInput.value = '';
                await loadNotes();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // 5. Mazání vzkazů
    if (notesList) {
        notesList.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-note-btn');
            if (!deleteBtn) return;

            const noteItem = deleteBtn.closest('.note-item');
            const noteId = noteItem.dataset.id;

            if (confirm('Opravdu chcete smazat tento vzkaz?')) {
                const token = getToken();
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
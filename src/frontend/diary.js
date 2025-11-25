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
  const diaryCalendar = document.getElementById("diary-calendar");
  const currentFolderTitle = document.getElementById("current-diary-folder-title");

  // Buttons
  const createFolderBtn = document.getElementById("create-diary-folder-btn");
  const backToFoldersBtn = document.getElementById("back-to-diary-folders-btn");

  // Modals - Create Folder
  const createFolderModal = document.getElementById("create-diary-folder-modal");
  const createFolderForm = document.getElementById("create-diary-folder-form");
  const folderNameInput = document.getElementById("diary-folder-name-input");

  // Modals - Notebook (Entry)
  const notebookModal = document.getElementById("notebook-modal");
  const notebookDateDisplay = document.getElementById("notebook-date-display");
  const notebookTextarea = document.getElementById("notebook-textarea");
  const notebookCloseBtn = document.querySelector(".notebook-close-button");
  const saveEntryBtn = document.getElementById("save-notebook-entry-btn");
  const deleteEntryBtn = document.getElementById("delete-notebook-entry-btn");

  // State
  let currentFolderId = null;
  let currentEntries = [];
  let currentSelectedDate = null; // "YYYY-MM-DD"
  let currentEntryId = null; // Pokud editujeme existující

  const backendUrl = "";

  // --- Auth Check ---
  const loggedInUsername = localStorage.getItem("username");
  const token = localStorage.getItem("authToken");

  if (loggedInUsername && token) {
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

  // --- API Helper ---
  async function apiFetch(url, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        alert("Sezení vypršelo. Přihlaste se znovu.");
        localStorage.clear();
        window.location.href = "index.html";
        return null;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || response.statusText);
      }
      return options.method === "DELETE" && response.status === 200 ? true : response.json();
    } catch (error) {
      console.error("API Error:", error);
      showToast(error.message, "error");
      return null;
    }
  }

  function showToast(message, type = "success") {
    const toast = document.getElementById("success-toast");
    if (!toast) return;
    toast.querySelector("span").textContent = message;
    toast.style.backgroundColor = type === "success" ? "#10b981" : "#ef4444";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // --- Folders Logic ---
  async function loadFolders() {
    const folders = await apiFetch(`${backendUrl}/api/diary/folders`);
    if (folders) {
      renderFolders(folders);
    }
  }

  function renderFolders(folders) {
    foldersGrid.innerHTML = "";
    if (folders.length === 0) {
      foldersGrid.innerHTML = '<p class="empty-state">Zatím žádná období. Vytvořte první!</p>';
      return;
    }
    folders.forEach((folder) => {
      const el = document.createElement("div");
      el.className = "folder-card";
      el.innerHTML = `
                <div class="folder-icon"><i class="fas fa-book-journal-whills"></i></div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <span class="folder-date">${new Date(folder.createdAt).toLocaleDateString()}</span>
                </div>
            `;
      el.onclick = () => openFolder(folder.id, folder.name);
      foldersGrid.appendChild(el);
    });
  }

  createFolderBtn.addEventListener("click", () => {
    createFolderModal.style.display = "flex";
    folderNameInput.value = "";
    folderNameInput.focus();
  });

  createFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = folderNameInput.value.trim();
    if (!name) return;

    const result = await apiFetch(`${backendUrl}/api/diary/folders`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (result) {
      createFolderModal.style.display = "none";
      showToast("Období vytvořeno.");
      loadFolders();
    }
  });

  // --- Entries Logic ---
  async function openFolder(folderId, folderName) {
    currentFolderId = folderId;
    currentFolderTitle.textContent = folderName;
    foldersView.style.display = "none";
    entriesView.style.display = "flex";

    loadEntries(folderId);
  }

  backToFoldersBtn.addEventListener("click", () => {
    entriesView.style.display = "none";
    foldersView.style.display = "flex";
    currentFolderId = null;
    loadFolders();
  });

  async function loadEntries(folderId) {
    const entries = await apiFetch(`${backendUrl}/api/diary/entries?folderId=${folderId}`);
    if (entries) {
      currentEntries = entries;
      renderCalendar();
    }
  }

  function renderCalendar() {
    diaryCalendar.innerHTML = "";

    // Jednoduchý kalendář - posledních 30 dní + dnešek (pro ukázku, lze rozšířit)
    // Nebo lépe: Zobrazit aktuální měsíc, nebo prostě grid dnů
    // Pro jednoduchost zobrazíme posledních 14 dní + možnost jít do historie?
    // Uděláme to jako grid 28 dní (4 týdny) zpětně od dneška

    const today = new Date();
    // Reset time
    today.setHours(0, 0, 0, 0);

    // Vygenerujeme pole dat pro zobrazení (např. 28 dní)
    const daysToShow = 28;
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD

      // Najdeme, jestli pro tento den existuje záznam v aktuální složce
      // Může být více záznamů v jeden den? Diary obvykle 1 den = 1 hlavní zápis, ale povolíme pole
      const entry = currentEntries.find((e) => e.date === dateStr);

      const dayCard = document.createElement("div");
      dayCard.className = `diary-day-card ${entry ? "has-entry" : ""}`;

      const dayName = d.toLocaleDateString("cs-CZ", { weekday: "short" });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString("cs-CZ", { month: "short" });

      let previewText = "";
      if (entry) {
        // Odstraníme HTML značky pro náhled, pokud tam jsou
        const div = document.createElement("div");
        div.innerHTML = entry.content;
        previewText = div.textContent || div.innerText || "";
      } else {
        previewText = '<span style="color:#e5e7eb; font-style:italic;">Prázdná stránka...</span>';
      }

      dayCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <span style="font-size:0.8em; color:#9ca3af;">${dayName}</span>
                    <span style="font-size:0.8em; color:#9ca3af;">${monthName}</span>
                </div>
                <div class="day-number">${dayNum}</div>
                <div class="entry-preview">${previewText}</div>
            `;

      dayCard.onclick = () => openNotebook(d, entry);
      diaryCalendar.appendChild(dayCard);
    }
  }

  // --- Notebook Modal Logic ---
  function openNotebook(dateObj, entry) {
    currentSelectedDate = dateObj.toISOString().split("T")[0];
    currentEntryId = entry ? entry.id : null;

    // Nastavit datum v hlavičce
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    notebookDateDisplay.textContent = dateObj.toLocaleDateString("cs-CZ", options);

    // Nastavit obsah
    notebookTextarea.value = entry ? entry.content : "";

    // Tlačítko smazat jen pokud existuje záznam
    deleteEntryBtn.style.display = entry ? "flex" : "none";

    notebookModal.style.display = "flex";
    // Auto focus na konec textu
    notebookTextarea.focus();
    if (notebookTextarea.value) {
      notebookTextarea.setSelectionRange(notebookTextarea.value.length, notebookTextarea.value.length);
    }
  }

  notebookCloseBtn.addEventListener("click", () => {
    notebookModal.style.display = "none";
  });

  // Kliknutí mimo sešit zavře modál (volitelné, někdy to uživatele štve)
  notebookModal.addEventListener("click", (e) => {
    if (e.target === notebookModal) {
      notebookModal.style.display = "none";
    }
  });

  saveEntryBtn.addEventListener("click", async () => {
    const content = notebookTextarea.value; // Zde ukládáme plain text z textarea
    if (!content.trim()) {
      showToast("Stránka je prázdná, nic neukládám.", "error");
      return;
    }

    // Pokud už záznam existuje, měli bychom ho updatovat (PUT), nebo smazat starý a vytvořit nový
    // Pro jednoduchost v server.ts máme zatím jen POST a DELETE.
    // Uděláme chytrou logiku: Pokud existuje ID, smažeme starý a vytvoříme nový (nebo přidáme PUT endpoint).
    // Vzhledem k aktuálnímu API (jen POST/DELETE entries) je nejčistší implementovat PUT v budoucnu,
    // ale teď to uděláme tak, že pokud existuje, smažeme ho a vytvoříme nový s novým obsahem (zachováme ID? ne, nové ID).
    // EDIT: V server.ts chybí PUT pro entries.
    // Workaround: Vytvoříme nový záznam. Pokud existuje starý, server ho neodmítne (není unique na datum),
    // ale my chceme jen jeden na den.
    // Vylepšení: Přidám logiku, že pokud edituji (mám currentEntryId), tak nejprve smažu starý.

    if (currentEntryId) {
      await apiFetch(`${backendUrl}/api/diary/entries/${currentEntryId}`, { method: "DELETE" });
    }

    const newEntry = {
      folderId: currentFolderId,
      date: currentSelectedDate,
      content: content,
    };

    const result = await apiFetch(`${backendUrl}/api/diary/entries`, {
      method: "POST",
      body: JSON.stringify(newEntry),
    });

    if (result) {
      showToast("Zápis uložen do deníčku.");
      notebookModal.style.display = "none";
      loadEntries(currentFolderId); // Refresh kalendáře
    }
  });

  deleteEntryBtn.addEventListener("click", async () => {
    if (!currentEntryId) return;
    if (!confirm("Opravdu chceš vytrhnout tuto stránku? (Smazat zápis)")) return;

    const result = await apiFetch(`${backendUrl}/api/diary/entries/${currentEntryId}`, {
      method: "DELETE",
    });

    if (result) {
      showToast("Stránka vytržena.");
      notebookModal.style.display = "none";
      loadEntries(currentFolderId);
    }
  });

  // Zavírání modalů křížkem
  document.querySelectorAll(".modal-close-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-overlay");
      if (modal) modal.style.display = "none";
    });
  });
});

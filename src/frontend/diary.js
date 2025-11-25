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
  const currentDiaryTitle = document.getElementById("current-diary-title");

  // Buttons
  const createFolderBtn = document.getElementById("create-diary-folder-btn");
  const backToFoldersBtn = document.getElementById("back-to-diary-folders-btn");
  // Tlačítko smazat v patičce seznamu složek
  const deleteFolderListBtn = document.getElementById("delete-diary-folder-list-btn");

  // Modals
  const createFolderModal = document.getElementById("create-diary-folder-modal");
  const createFolderForm = document.getElementById("create-diary-folder-form");
  const folderNameInput = document.getElementById("diary-folder-name-input");

  // Modal Delete
  const deleteFolderModal = document.getElementById("delete-diary-folder-modal");
  const deleteFolderForm = document.getElementById("delete-diary-folder-form");
  const deleteConfirmInput = document.getElementById("delete-diary-confirm-input");

  // Modal Notebook
  const notebookModal = document.getElementById("notebook-modal");
  const notebookDateDisplay = document.getElementById("notebook-date-display");
  const notebookTextarea = document.getElementById("notebook-textarea");
  const notebookCloseBtn = document.querySelector(".notebook-close-button");
  const saveEntryBtn = document.getElementById("save-notebook-entry-btn");
  const deleteEntryBtn = document.getElementById("delete-notebook-entry-btn");

  // --- State ---
  const backendUrl = "";
  let currentFolderId = null;
  let currentEntries = [];
  let currentSelectedDate = null;
  let currentEntryId = null;

  // Selection state for folders
  let selectedFolderId = null;
  let allFolders = [];

  // --- Auth Check ---
  const loggedInUsername = localStorage.getItem("username");
  const userRole = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
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
        alert("Sezení vypršelo.");
        localStorage.clear();
        window.location.href = "index.html";
        return null;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Chyba serveru");
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
      allFolders = folders;
      renderFolders(folders);
    }
  }

  function renderFolders(folders) {
    foldersGrid.innerHTML = "";
    if (folders.length === 0) {
      foldersGrid.innerHTML = '<p class="empty-state">Deník je prázdný. Založte první období!</p>';
      return;
    }
    folders.forEach((folder) => {
      const el = document.createElement("div");
      // Přidáme třídu selected, pokud je vybrána
      el.className = `folder-card diary-folder ${folder.id === selectedFolderId ? "selected" : ""}`;
      el.dataset.id = folder.id;

      // Zabraňuje defaultnímu kliku a otevření složky, pokud je vybrán checkbox
      el.onclick = (e) => {
        if (e.target.type !== "checkbox") {
          openFolder(folder.id, folder.name);
        }
      };

      // Checkbox pro výběr (stejné jako galerie)
      const checkboxHTML = `
                <div class="folder-checkbox-wrapper">
                    <input type="checkbox" class="folder-checkbox" data-id="${folder.id}" ${folder.id === selectedFolderId ? "checked" : ""}>
                </div>
            `;

      // Ikonka zápisníku (fa-book-journal-whills)
      el.innerHTML = `
                ${checkboxHTML}
                <div class="folder-icon" style="color: #fbbf24;"><i class="fas fa-book-journal-whills"></i></div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <span class="folder-date">Vytvořil: ${folder.createdBy || "?"}</span>
                </div>
            `;
      foldersGrid.appendChild(el);
    });

    setupFolderCheckboxes();
    updateFolderActionsUI();
  }

  function setupFolderCheckboxes() {
    foldersGrid.querySelectorAll(".folder-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        // Single selection logic
        foldersGrid.querySelectorAll(".folder-checkbox").forEach((otherCheckbox) => {
          if (otherCheckbox.dataset.id !== id) {
            otherCheckbox.checked = false;
            otherCheckbox.closest(".folder-card").classList.remove("selected");
          }
        });

        if (e.target.checked) {
          selectedFolderId = id;
          e.target.closest(".folder-card").classList.add("selected");
        } else {
          selectedFolderId = null;
          e.target.closest(".folder-card").classList.remove("selected");
        }
        updateFolderActionsUI();
      });
    });
  }

  function updateFolderActionsUI() {
    if (selectedFolderId) {
      deleteFolderListBtn.style.display = "inline-flex";
    } else {
      deleteFolderListBtn.style.display = "none";
    }
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

  // --- Deletion Logic (Folder) ---
  deleteFolderListBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;
    const folder = allFolders.find((f) => f.id === selectedFolderId);
    if (folder) {
      performFolderDeleteCheck(selectedFolderId, folder.name);
    }
  });

  async function performFolderDeleteCheck(folderId, folderName) {
    // Zjistíme, jestli má složka zápisy
    const entries = await apiFetch(`${backendUrl}/api/diary/entries?folderId=${folderId}`);
    const isEmpty = entries && entries.length === 0;
    const isAdmin = userRole === "admin";
    const isCreator = allFolders.find((f) => f.id === folderId)?.createdBy === loggedInUsername;

    if (isEmpty) {
      // Prázdná složka - stačí potvrzení (pokud je admin nebo tvůrce)
      if (isAdmin || isCreator) {
        if (confirm(`Opravdu smazat prázdné období "${folderName}"?`)) {
          performFolderDelete(folderId);
        }
      } else {
        showToast("Cizí složky může mazat jen autor nebo admin.", "error");
      }
    } else {
      // Neprázdná složka
      if (!isAdmin && !isCreator) {
        showToast("Nemáte oprávnění smazat toto období.", "error");
        return;
      }

      // Zobrazit Warning Modal
      deleteConfirmInput.value = "";
      deleteFolderModal.style.display = "flex";
      deleteConfirmInput.focus();
    }
  }

  deleteFolderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputValue = deleteConfirmInput.value.trim();
    if (inputValue === "DELETE") {
      performFolderDelete(selectedFolderId);
      deleteFolderModal.style.display = "none";
    } else {
      showToast("Musíte napsat přesně 'DELETE'.", "error");
    }
  });

  async function performFolderDelete(folderId) {
    const result = await apiFetch(`${backendUrl}/api/diary/folders/${folderId}`, {
      method: "DELETE",
    });
    if (result) {
      showToast("Období smazáno.");
      selectedFolderId = null;
      loadFolders();
    }
  }

  // --- Entries Logic ---
  function openFolder(id, name) {
    currentFolderId = id;
    currentDiaryTitle.textContent = name;
    foldersView.style.display = "none";
    entriesView.style.display = "flex";

    // Reset výběru složky při vstupu dovnitř
    selectedFolderId = null;
    updateFolderActionsUI();

    loadEntries(id);
  }

  function backToFolders() {
    entriesView.style.display = "none";
    foldersView.style.display = "flex";
    currentFolderId = null;
    loadFolders(); // Refresh to keep checkboxes logic working
  }
  backToFoldersBtn.addEventListener("click", backToFolders);

  async function loadEntries(folderId) {
    const entries = await apiFetch(`${backendUrl}/api/diary/entries?folderId=${folderId}`);
    if (entries) {
      currentEntries = entries;
      renderCalendar();
    }
  }

  function renderCalendar() {
    diaryCalendar.innerHTML = "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysToShow = 28;
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const entry = currentEntries.find((e) => e.date === dateStr);

      const dayCard = document.createElement("div");
      dayCard.className = `diary-day-card ${entry ? "has-entry" : ""}`;

      const dayName = d.toLocaleDateString("cs-CZ", { weekday: "short" });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString("cs-CZ", { month: "short" });

      let previewText = "";
      if (entry) {
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

    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    notebookDateDisplay.textContent = dateObj.toLocaleDateString("cs-CZ", options);

    notebookTextarea.value = entry ? entry.content : "";

    deleteEntryBtn.style.display = entry ? "flex" : "none";

    notebookModal.style.display = "flex";
    notebookTextarea.focus();
    if (notebookTextarea.value) {
      notebookTextarea.setSelectionRange(notebookTextarea.value.length, notebookTextarea.value.length);
    }
  }

  notebookCloseBtn.addEventListener("click", () => {
    notebookModal.style.display = "none";
  });

  notebookModal.addEventListener("click", (e) => {
    if (e.target === notebookModal) {
      notebookModal.style.display = "none";
    }
  });

  saveEntryBtn.addEventListener("click", async () => {
    const content = notebookTextarea.value;
    if (!content.trim()) {
      showToast("Stránka je prázdná, nic neukládám.", "error");
      return;
    }

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
      loadEntries(currentFolderId);
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

  document.querySelectorAll(".modal-close-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-overlay");
      if (modal) modal.style.display = "none";
      // Reset inputs
      if (modal.id === "delete-diary-folder-modal") deleteFolderForm.reset();
    });
  });
});

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
      // Změna ikony na fa-book-journal-whills
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysToShow = 28;
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD

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
    });
  });
});

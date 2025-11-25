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
  const deleteFolderListBtn = document.getElementById("delete-diary-folder-list-btn");
  const renameFolderListBtn = document.getElementById("rename-diary-folder-list-btn");

  // Modals
  const createFolderModal = document.getElementById("create-diary-folder-modal");
  const createFolderForm = document.getElementById("create-diary-folder-form");
  const folderNameInput = document.getElementById("diary-folder-name-input");
  const folderStartDateInput = document.getElementById("diary-start-date");
  const folderEndDateInput = document.getElementById("diary-end-date");

  // Modal Rename
  const renameFolderModal = document.getElementById("rename-diary-folder-modal");
  const renameFolderForm = document.getElementById("rename-diary-folder-form");
  const newFolderNameInput = document.getElementById("new-diary-folder-name-input");
  const oldFolderNameSpan = document.getElementById("old-diary-folder-name");

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
  const attachPhotoBtn = document.getElementById("attach-photo-btn");
  const notebookAttachmentsArea = document.getElementById("notebook-attachments-area");

  // Modal Photo Picker
  const selectGalleryPhotoModal = document.getElementById("select-gallery-photo-modal");
  const galleryPickerFolders = document.getElementById("gallery-picker-folders");
  const galleryPickerPhotos = document.getElementById("gallery-picker-photos");
  const galleryPickerBackBtn = document.getElementById("gallery-picker-back-btn");
  const galleryPickerConfirmBtn = document.getElementById("gallery-picker-confirm-btn");
  const galleryPickerCloseBtn = selectGalleryPhotoModal.querySelector(".modal-close-button");

  // --- State ---
  const backendUrl = "";
  let currentFolderId = null;
  let currentEntries = [];
  let currentSelectedDate = null;
  let currentEntryId = null;
  let currentEntryPhotoIds = []; // ID fotek aktuálně připojených k otevřenému zápisu

  // Selection state for folders
  let selectedFolderId = null;
  let allFolders = [];

  // Gallery Picker State
  let pickerCurrentFolderId = null;
  let pickerSelectedPhotoIds = new Set();
  let allGalleryFolders = [];
  let currentGalleryPhotos = [];

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
      foldersGrid.innerHTML = '<p class="empty-state">Deník je prázdný. Založte první!</p>';
      return;
    }
    folders.forEach((folder) => {
      const el = document.createElement("div");
      el.className = `folder-card diary-folder ${folder.id === selectedFolderId ? "selected" : ""}`;
      el.dataset.id = folder.id;

      el.onclick = (e) => {
        if (e.target.type !== "checkbox") {
          openFolder(folder.id, folder.name);
        }
      };

      const checkboxHTML = `
                <div class="folder-checkbox-wrapper">
                    <input type="checkbox" class="folder-checkbox" data-id="${folder.id}" ${folder.id === selectedFolderId ? "checked" : ""}>
                </div>
            `;

      let dateRange = "";
      if (folder.startDate && folder.endDate) {
        const d1 = new Date(folder.startDate).toLocaleDateString("cs-CZ");
        const d2 = new Date(folder.endDate).toLocaleDateString("cs-CZ");
        dateRange = `<div style="font-size: 0.8em; color: #555; margin-top:5px;">${d1} - ${d2}</div>`;
      }

      el.innerHTML = `
                ${checkboxHTML}
                <div class="folder-icon" style="color: #fbbf24;"><i class="fas fa-book-journal-whills"></i></div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    ${dateRange}
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
      renameFolderListBtn.style.display = "inline-flex"; // Zobrazení tlačítka přejmenovat
    } else {
      deleteFolderListBtn.style.display = "none";
      renameFolderListBtn.style.display = "none";
    }
  }

  createFolderBtn.addEventListener("click", () => {
    createFolderModal.style.display = "flex";
    folderNameInput.value = "";
    folderStartDateInput.value = "";
    folderEndDateInput.value = "";
    folderNameInput.focus();
  });

  createFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = folderNameInput.value.trim();
    const startDate = folderStartDateInput.value;
    const endDate = folderEndDateInput.value;

    if (!name || !startDate || !endDate) {
      showToast("Vyplňte název a obě data.", "error");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast("Datum 'Od' musí být před 'Do'.", "error");
      return;
    }

    const result = await apiFetch(`${backendUrl}/api/diary/folders`, {
      method: "POST",
      body: JSON.stringify({ name, startDate, endDate }),
    });
    if (result) {
      createFolderModal.style.display = "none";
      showToast("Deník vytvořen.");
      loadFolders();
    }
  });

  // --- Rename Logic ---
  renameFolderListBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;
    const folder = allFolders.find((f) => f.id === selectedFolderId);
    if (!folder) return;

    oldFolderNameSpan.textContent = folder.name;
    newFolderNameInput.value = folder.name;
    renameFolderModal.style.display = "flex";
    newFolderNameInput.focus();
  });

  renameFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = newFolderNameInput.value.trim();
    if (!newName) return;

    const result = await apiFetch(`${backendUrl}/api/diary/folders/${selectedFolderId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });

    if (result) {
      renameFolderModal.style.display = "none";
      showToast("Deník přejmenován.");
      selectedFolderId = null; // Reset výběru po akci
      loadFolders();
    }
  });

  deleteFolderListBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;
    const folder = allFolders.find((f) => f.id === selectedFolderId);
    if (folder) {
      performFolderDeleteCheck(selectedFolderId, folder.name);
    }
  });

  async function performFolderDeleteCheck(folderId, folderName) {
    const entries = await apiFetch(`${backendUrl}/api/diary/entries?folderId=${folderId}`);
    const isEmpty = entries && entries.length === 0;
    const isAdmin = userRole === "admin";
    const isCreator = allFolders.find((f) => f.id === folderId)?.createdBy === loggedInUsername;

    if (isEmpty) {
      if (isAdmin || isCreator) {
        if (confirm(`Opravdu smazat prázdný deník "${folderName}"?`)) {
          performFolderDelete(folderId);
        }
      } else {
        showToast("Cizí deníky může mazat jen autor nebo admin.", "error");
      }
    } else {
      if (!isAdmin && !isCreator) {
        showToast("Nemáte oprávnění smazat tento deník.", "error");
        return;
      }
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
      showToast("Deník smazán.");
      selectedFolderId = null;
      loadFolders();
    }
  }

  function openFolder(id, name) {
    currentFolderId = id;
    currentDiaryTitle.textContent = name;
    foldersView.style.display = "none";
    entriesView.style.display = "flex";
    selectedFolderId = null;
    updateFolderActionsUI();
    loadEntries(id);
  }

  function backToFolders() {
    entriesView.style.display = "none";
    foldersView.style.display = "flex";
    currentFolderId = null;
    loadFolders();
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

    const folder = allFolders.find((f) => f.id === currentFolderId);
    if (!folder || !folder.startDate || !folder.endDate) {
      diaryCalendar.innerHTML = "<p>Chyba v datech deníku.</p>";
      return;
    }

    const start = new Date(folder.startDate);
    const end = new Date(folder.endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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
        if (entry.galleryPhotoIds && entry.galleryPhotoIds.length > 0) {
          previewText += ` <i class="fas fa-image" title="Obsahuje ${entry.galleryPhotoIds.length} fotek"></i>`;
        }
      }

      const clickDate = new Date(d);

      dayCard.innerHTML = `
                <div class="day-header-row">
                    <span>${dayName}</span>
                    <span>${monthName}</span>
                </div>
                <div class="day-number">${dayNum}</div>
                <div class="entry-preview">${previewText}</div>
            `;

      dayCard.onclick = () => openNotebook(clickDate, entry);
      diaryCalendar.appendChild(dayCard);
    }
  }

  async function openNotebook(dateObj, entry) {
    currentSelectedDate = dateObj.toISOString().split("T")[0];
    currentEntryId = entry ? entry.id : null;
    currentEntryPhotoIds = entry && entry.galleryPhotoIds ? [...entry.galleryPhotoIds] : [];

    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    notebookDateDisplay.textContent = dateObj.toLocaleDateString("cs-CZ", options);

    notebookTextarea.value = entry ? entry.content : "";

    deleteEntryBtn.style.display = entry ? "flex" : "none";

    await renderNotebookAttachments(); // Načte a zobrazí připojené fotky

    notebookModal.style.display = "flex";
    notebookTextarea.focus();
    if (notebookTextarea.value) {
      notebookTextarea.setSelectionRange(notebookTextarea.value.length, notebookTextarea.value.length);
    }
  }

  // --- Attachments Logic ---
  async function renderNotebookAttachments() {
    notebookAttachmentsArea.innerHTML = "";
    if (currentEntryPhotoIds.length === 0) return;

    // Musíme načíst všechny fotky abychom našli URL podle ID. Není to nejefektivnější, ale pro "jednoduché řešení" ok.
    // Lepší by bylo fetchovat jen konkrétní fotky, ale API endpoint máme jen na všechny.
    try {
      const allPhotos = await apiFetch(`${backendUrl}/api/gallery/photos`);
      if (!allPhotos) return;

      currentEntryPhotoIds.forEach((photoId) => {
        const photo = allPhotos.find((p) => p.id === photoId);
        if (photo) {
          const imgWrapper = document.createElement("div");
          imgWrapper.className = "attachment-thumbnail-wrapper";
          imgWrapper.style.position = "relative";
          imgWrapper.style.display = "inline-block";
          imgWrapper.style.margin = "5px";

          const img = document.createElement("img");
          img.src = photo.src;
          img.className = "attachment-thumbnail";
          img.style.width = "80px";
          img.style.height = "80px";
          img.style.objectFit = "cover";
          img.style.borderRadius = "8px";
          img.style.border = "2px solid #ddd";

          const removeBtn = document.createElement("div");
          removeBtn.innerHTML = "&times;";
          removeBtn.style.position = "absolute";
          removeBtn.style.top = "-5px";
          removeBtn.style.right = "-5px";
          removeBtn.style.backgroundColor = "red";
          removeBtn.style.color = "white";
          removeBtn.style.borderRadius = "50%";
          removeBtn.style.width = "20px";
          removeBtn.style.height = "20px";
          removeBtn.style.textAlign = "center";
          removeBtn.style.lineHeight = "18px";
          removeBtn.style.cursor = "pointer";
          removeBtn.style.fontSize = "14px";

          removeBtn.onclick = () => {
            currentEntryPhotoIds = currentEntryPhotoIds.filter((id) => id !== photoId);
            renderNotebookAttachments(); // Překreslit
          };

          imgWrapper.appendChild(img);
          imgWrapper.appendChild(removeBtn);
          notebookAttachmentsArea.appendChild(imgWrapper);
        }
      });
    } catch (e) {
      console.error("Chyba při vykreslování příloh:", e);
    }
  }

  // --- Gallery Picker Logic ---
  attachPhotoBtn.addEventListener("click", async () => {
    // 1. Načíst složky galerie
    const folders = await apiFetch(`${backendUrl}/api/gallery/folders`);
    if (!folders) return;

    allGalleryFolders = folders;
    renderGalleryPickerFolders();

    // Reset stavu pickeru
    pickerSelectedPhotoIds.clear();
    pickerCurrentFolderId = null;
    galleryPickerPhotos.style.display = "none";
    galleryPickerFolders.style.display = "grid";
    galleryPickerBackBtn.style.display = "none";

    selectGalleryPhotoModal.style.display = "flex";
  });

  function renderGalleryPickerFolders() {
    galleryPickerFolders.innerHTML = "";
    allGalleryFolders.forEach((folder) => {
      const el = document.createElement("div");
      el.className = "folder-card"; // Recyklujeme styly
      el.style.height = "120px"; // Menší pro picker
      el.style.padding = "10px";
      el.innerHTML = `
            <div class="folder-icon" style="font-size: 2em; margin-bottom: 5px;"><i class="fas fa-folder"></i></div>
            <div class="folder-info">
                <h3 style="font-size: 0.9em; margin: 0;">${folder.name}</h3>
            </div>
          `;
      el.onclick = () => openPickerFolder(folder.id);
      galleryPickerFolders.appendChild(el);
    });
  }

  async function openPickerFolder(folderId) {
    pickerCurrentFolderId = folderId;
    const photos = await apiFetch(`${backendUrl}/api/gallery/photos?folderId=${folderId}`);
    currentGalleryPhotos = photos || [];

    galleryPickerFolders.style.display = "none";
    galleryPickerPhotos.style.display = "grid";
    galleryPickerBackBtn.style.display = "flex";

    renderPickerPhotos();
  }

  function renderPickerPhotos() {
    galleryPickerPhotos.innerHTML = "";
    currentGalleryPhotos.forEach((photo) => {
      const el = document.createElement("div");
      el.style.position = "relative";
      el.style.cursor = "pointer";

      const isSelected = pickerSelectedPhotoIds.has(photo.id) || currentEntryPhotoIds.includes(photo.id);
      const isAlreadyAttached = currentEntryPhotoIds.includes(photo.id);

      const img = document.createElement("img");
      img.src = photo.src;
      img.style.width = "100%";
      img.style.height = "100px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "4px";
      if (isSelected) {
        img.style.border = "3px solid #d97706";
        img.style.opacity = "0.7";
      }

      if (isAlreadyAttached) {
        img.style.filter = "grayscale(100%)";
        el.title = "Již připojeno";
      }

      el.appendChild(img);

      if (isSelected && !isAlreadyAttached) {
        const check = document.createElement("div");
        check.innerHTML = '<i class="fas fa-check"></i>';
        check.style.position = "absolute";
        check.style.top = "5px";
        check.style.right = "5px";
        check.style.color = "#d97706";
        check.style.fontSize = "1.2em";
        el.appendChild(check);
      }

      if (!isAlreadyAttached) {
        el.onclick = () => {
          if (pickerSelectedPhotoIds.has(photo.id)) {
            pickerSelectedPhotoIds.delete(photo.id);
          } else {
            pickerSelectedPhotoIds.add(photo.id);
          }
          renderPickerPhotos();
        };
      }

      galleryPickerPhotos.appendChild(el);
    });
  }

  galleryPickerBackBtn.addEventListener("click", () => {
    galleryPickerPhotos.style.display = "none";
    galleryPickerFolders.style.display = "grid";
    galleryPickerBackBtn.style.display = "none";
    pickerCurrentFolderId = null;
  });

  galleryPickerConfirmBtn.addEventListener("click", () => {
    // Přidat vybrané ID do currentEntryPhotoIds
    pickerSelectedPhotoIds.forEach((id) => {
      if (!currentEntryPhotoIds.includes(id)) {
        currentEntryPhotoIds.push(id);
      }
    });
    renderNotebookAttachments();
    selectGalleryPhotoModal.style.display = "none";
  });

  galleryPickerCloseBtn.addEventListener("click", () => {
    selectGalleryPhotoModal.style.display = "none";
  });

  // --- Notebook Actions ---
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
    if (!content.trim() && currentEntryPhotoIds.length === 0) {
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
      galleryPhotoIds: currentEntryPhotoIds, // Odesíláme seznam ID fotek
    };

    const result = await apiFetch(`${backendUrl}/api/diary/entries`, {
      method: "POST",
      body: JSON.stringify(newEntry),
    });

    if (result) {
      showToast("Zápis uložen.");
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
      if (modal.id === "delete-diary-folder-modal") deleteFolderForm.reset();
      if (modal.id === "rename-diary-folder-modal") renameFolderForm.reset();
    });
  });
});

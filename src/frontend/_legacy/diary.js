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

  // Lightbox Elements (NEW)
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxDownload = document.getElementById("lightbox-download");
  const lightboxDescription = document.getElementById("lightbox-description");

  // --- State ---
  const backendUrl = "";
  let currentFolderId = null;
  let currentEntries = [];
  let currentSelectedDate = null;
  let currentEntryId = null;
  let currentEntryPhotoIds = [];

  // Data fotek pro Lightbox
  let currentNotebookPhotosData = []; // Ukládáme celé objekty fotek pro lightbox
  let currentLightboxIndex = 0;

  // Selection state for folders
  let selectedFolderId = null;
  let allFolders = [];

  // Gallery Picker State
  let pickerCurrentFolderId = null;
  let pickerSelectedPhotoIds = new Set();
  let allGalleryFolders = [];
  let currentGalleryPhotos = [];

  // --- Auth Check — use Common module ---
  const loggedInUsername = Common.username;
  const userRole = Common.role;
  const userId = Common.userId;
  const token = Common.token;

  if (Common.checkAuth(appContainer, authContainer, loggedInUsernameElement)) {
    loadFolders();
  }
  Common.setupLogout(logoutButton);

  // Use shared API helpers from common.js
  const apiFetch = Common.authFetch;
  const showToast = Common.showToast;

  // ... (Zbytek kódu pro složky a kalendář zůstává stejný až po attach photo) ...
  // ZKOPÍROVAT: Kód loadFolders, renderFolders, setupFolderCheckboxes, createFolder atd.
  // Pro úsporu místa vkládám jen to, co se měnilo pro Lightbox a Attachments.

  // --- Folders Logic (zkráceno - vložte původní logiku) ---
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
      foldersGrid.innerHTML = '<p class="empty-state">Deník je prázdný.</p>';
      return;
    }
    folders.forEach((folder) => {
      const el = document.createElement("div");
      el.className = `folder-card diary-folder ${folder.id === selectedFolderId ? "selected" : ""}`;
      el.dataset.id = folder.id;
      el.onclick = (e) => {
        if (e.target.type !== "checkbox") openFolder(folder.id, folder.name);
      };
      let dateRange = "";
      if (folder.startDate && folder.endDate) {
        const d1 = new Date(folder.startDate).toLocaleDateString("cs-CZ");
        const d2 = new Date(folder.endDate).toLocaleDateString("cs-CZ");
        dateRange = `<div style="font-size: 0.8em; color: #555; margin-top:5px;">${d1} - ${d2}</div>`;
      }
      el.innerHTML = `
            <div class="folder-checkbox-wrapper"><input type="checkbox" class="folder-checkbox" data-id="${folder.id}" ${folder.id === selectedFolderId ? "checked" : ""}></div>
            <div class="folder-icon" style="color: #fbbf24;"><i class="fas fa-book-journal-whills"></i></div>
            <div class="folder-info"><h3>${folder.name}</h3>${dateRange}<span class="folder-date">Vytvořil: ${folder.createdBy || "?"}</span></div>
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
        foldersGrid.querySelectorAll(".folder-checkbox").forEach((other) => {
          if (other.dataset.id !== id) {
            other.checked = false;
            other.closest(".folder-card").classList.remove("selected");
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
      renameFolderListBtn.style.display = "inline-flex";
    } else {
      deleteFolderListBtn.style.display = "none";
      renameFolderListBtn.style.display = "none";
    }
  }

  // Listeners pro Create, Rename, Delete folder... (Vložte původní kód)
  createFolderBtn.addEventListener("click", () => {
    createFolderModal.style.display = "flex";
    folderNameInput.value = "";
    folderStartDateInput.value = "";
    folderEndDateInput.value = "";
  });
  createFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await apiFetch(`${backendUrl}/api/diary/folders`, {
      method: "POST",
      body: JSON.stringify({ name: folderNameInput.value, startDate: folderStartDateInput.value, endDate: folderEndDateInput.value }),
    });
    if (result) {
      createFolderModal.style.display = "none";
      loadFolders();
      showToast("Vytvořeno");
    }
  });

  renameFolderListBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;
    const f = allFolders.find((x) => x.id === selectedFolderId);
    if (f) {
      newFolderNameInput.value = f.name;
      oldFolderNameSpan.textContent = f.name;
      renameFolderModal.style.display = "flex";
    }
  });
  renameFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await apiFetch(`${backendUrl}/api/diary/folders/${selectedFolderId}`, { method: "PATCH", body: JSON.stringify({ name: newFolderNameInput.value }) });
    if (result) {
      renameFolderModal.style.display = "none";
      selectedFolderId = null;
      loadFolders();
      showToast("Přejmenováno");
    }
  });

  deleteFolderListBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;
    const f = allFolders.find((x) => x.id === selectedFolderId);
    if (f) {
      deleteConfirmInput.value = "";
      deleteFolderModal.style.display = "flex";
    }
  });
  deleteFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (deleteConfirmInput.value === "DELETE") {
      await apiFetch(`${backendUrl}/api/diary/folders/${selectedFolderId}`, { method: "DELETE" });
      deleteFolderModal.style.display = "none";
      selectedFolderId = null;
      loadFolders();
      showToast("Smazáno");
    }
  });

  function openFolder(id, name) {
    currentFolderId = id;
    currentDiaryTitle.textContent = name;
    foldersView.style.display = "none";
    entriesView.style.display = "flex";
    selectedFolderId = null;
    updateFolderActionsUI();
    loadEntries(id);
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
    const folder = allFolders.find((f) => f.id === currentFolderId);
    if (!folder) return;
    const start = new Date(folder.startDate);
    const end = new Date(folder.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const entry = currentEntries.find((e) => e.date === dateStr);
      const dayCard = document.createElement("div");
      dayCard.className = `diary-day-card ${entry ? "has-entry" : ""}`;
      const dayName = d.toLocaleDateString("cs-CZ", { weekday: "short" });
      const dayNum = d.getDate();
      let preview = entry ? entry.content.substring(0, 50) : "";
      if (entry && entry.galleryPhotoIds?.length > 0) preview += ` <i class="fas fa-image"></i>`;

      dayCard.innerHTML = `<div class="day-header-row"><span>${dayName}</span></div><div class="day-number">${dayNum}</div><div class="entry-preview">${preview}</div>`;
      const clickDate = new Date(d);
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

    await renderNotebookAttachments();

    notebookModal.style.display = "flex";
    // Posunout scroll nahoru při otevření
    notebookTextarea.scrollTop = 0;
  }

  // --- Attachments Logic (UPRAVENO PRO LIGHTBOX) ---
  async function renderNotebookAttachments() {
    notebookAttachmentsArea.innerHTML = "";
    currentNotebookPhotosData = []; // Reset data pro lightbox

    if (currentEntryPhotoIds.length === 0) {
      // Pokud nejsou fotky, můžeme skrýt nebo zmenšit oblast?
      // Necháme to prázdné, CSS má min-height.
      return;
    }

    try {
      // Fetch only the specific photos we need, not ALL gallery photos
      const idsParam = currentEntryPhotoIds.join(",");
      const allPhotos = await apiFetch(`${backendUrl}/api/gallery/photos?ids=${idsParam}`);
      if (!allPhotos) return;

      currentEntryPhotoIds.forEach((photoId, index) => {
        const photo = allPhotos.find((p) => p.id === photoId);
        if (photo) {
          // Uložíme si fotku pro lightbox
          currentNotebookPhotosData.push(photo);

          // Vytvoření elementu
          const imgWrapper = document.createElement("div");
          imgWrapper.className = "attachment-thumbnail-wrapper";

          const img = document.createElement("img");
          img.src = photo.thumb || photo.src;
          img.className = "attachment-thumbnail";
          img.alt = "Foto v deníku";
          img.loading = "lazy";

          // Kliknutí na fotku otevře Lightbox
          img.onclick = () => openLightbox(index);

          const removeBtn = document.createElement("div");
          removeBtn.className = "attachment-remove-btn";
          removeBtn.innerHTML = "&times;";
          removeBtn.title = "Odebrat fotku z deníku";

          removeBtn.onclick = (e) => {
            e.stopPropagation(); // Aby se neotevřel lightbox
            currentEntryPhotoIds = currentEntryPhotoIds.filter((id) => id !== photoId);
            renderNotebookAttachments();
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

  // --- Lightbox Logic (NOVÉ PRO DENÍK) ---
  function openLightbox(index) {
    currentLightboxIndex = index;
    updateLightboxContent();
    lightboxModal.style.display = "flex";
  }

  function updateLightboxContent() {
    const photo = currentNotebookPhotosData[currentLightboxIndex];
    if (!photo) return;

    lightboxImg.src = photo.src;
    lightboxDownload.href = photo.src;

    if (lightboxDescription) {
      lightboxDescription.textContent = photo.description || "";
    }
  }

  function closeLightbox() {
    lightboxModal.style.display = "none";
    lightboxImg.src = "";
  }

  // Listeners pro Lightbox
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxModal)
    lightboxModal.addEventListener("click", (e) => {
      if (e.target.classList.contains("lightbox-overlay")) closeLightbox();
    });

  if (lightboxPrev)
    lightboxPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxContent();
      }
    });

  if (lightboxNext)
    lightboxNext.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentLightboxIndex < currentNotebookPhotosData.length - 1) {
        currentLightboxIndex++;
        updateLightboxContent();
      }
    });

  // Klávesnice pro Lightbox
  document.addEventListener("keydown", (e) => {
    if (lightboxModal.style.display === "flex") {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxContent();
      }
      if (e.key === "ArrowRight" && currentLightboxIndex < currentNotebookPhotosData.length - 1) {
        currentLightboxIndex++;
        updateLightboxContent();
      }
    }
  });

  // --- Gallery Picker Logic (Zůstává stejná) ---
  attachPhotoBtn.addEventListener("click", async () => {
    const folders = await apiFetch(`${backendUrl}/api/gallery/folders`);
    if (!folders) return;
    allGalleryFolders = folders;
    renderGalleryPickerFolders();
    pickerSelectedPhotoIds.clear();
    galleryPickerPhotos.style.display = "none";
    galleryPickerFolders.style.display = "grid";
    galleryPickerBackBtn.style.display = "none";
    selectGalleryPhotoModal.style.display = "flex";
  });

  function renderGalleryPickerFolders() {
    galleryPickerFolders.innerHTML = "";
    allGalleryFolders.forEach((folder) => {
      const el = document.createElement("div");
      el.className = "folder-card";
      el.style.height = "120px";
      el.style.padding = "10px";
      el.innerHTML = `<div class="folder-icon" style="font-size: 2em; margin-bottom: 5px;"><i class="fas fa-folder"></i></div><div class="folder-info"><h3 style="font-size: 0.9em; margin: 0;">${folder.name}</h3></div>`;
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
      img.src = photo.thumb || photo.src;
      img.loading = "lazy";
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
          if (pickerSelectedPhotoIds.has(photo.id)) pickerSelectedPhotoIds.delete(photo.id);
          else pickerSelectedPhotoIds.add(photo.id);
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
  });
  galleryPickerConfirmBtn.addEventListener("click", () => {
    pickerSelectedPhotoIds.forEach((id) => {
      if (!currentEntryPhotoIds.includes(id)) currentEntryPhotoIds.push(id);
    });
    renderNotebookAttachments();
    selectGalleryPhotoModal.style.display = "none";
  });
  galleryPickerCloseBtn.addEventListener("click", () => (selectGalleryPhotoModal.style.display = "none"));

  // --- Notebook Actions ---
  notebookCloseBtn.addEventListener("click", () => (notebookModal.style.display = "none"));
  notebookModal.addEventListener("click", (e) => {
    if (e.target === notebookModal) notebookModal.style.display = "none";
  });

  saveEntryBtn.addEventListener("click", async () => {
    const content = notebookTextarea.value;
    if (!content.trim() && currentEntryPhotoIds.length === 0) {
      showToast("Stránka je prázdná.", "error");
      return;
    }

    let result;
    if (currentEntryId) {
      // Update existing entry via PUT (instead of DELETE + CREATE)
      result = await apiFetch(`${backendUrl}/api/diary/entries/${currentEntryId}`, {
        method: "PUT",
        body: JSON.stringify({ content, galleryPhotoIds: currentEntryPhotoIds }),
      });
    } else {
      // Create new entry
      const newEntry = { folderId: currentFolderId, date: currentSelectedDate, content, galleryPhotoIds: currentEntryPhotoIds };
      result = await apiFetch(`${backendUrl}/api/diary/entries`, { method: "POST", body: JSON.stringify(newEntry) });
    }

    if (result) {
      showToast("Zápis uložen.");
      notebookModal.style.display = "none";
      loadEntries(currentFolderId);
    }
  });

  deleteEntryBtn.addEventListener("click", async () => {
    if (!currentEntryId) return;
    if (!confirm("Opravdu vytrhnout stránku?")) return;
    const result = await apiFetch(`${backendUrl}/api/diary/entries/${currentEntryId}`, { method: "DELETE" });
    if (result) {
      showToast("Vytrženo.");
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

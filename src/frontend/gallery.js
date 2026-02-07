document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const appContainer = document.getElementById("app-container");
  const authContainer = document.getElementById("auth-container");
  const loggedInUsernameElement = document.getElementById("logged-in-username");
  const logoutButton = document.getElementById("logout-button");

  // Views
  const foldersView = document.getElementById("folders-view");
  const photosView = document.getElementById("photos-view");
  const foldersGrid = document.getElementById("folders-grid");
  const photosGrid = document.getElementById("photos-grid");
  const currentFolderTitle = document.getElementById("current-folder-title");

  // Buttons
  const createFolderBtn = document.getElementById("create-folder-btn");
  const backToFoldersBtn = document.getElementById("back-to-folders-btn");
  const uploadPhotoBtn = document.getElementById("upload-photo-btn");

  // Nové/Upravené tlačítka pro Folders View
  const renameFolderBtn = document.getElementById("rename-folder-btn");
  const deleteFolderListBtn = document.getElementById("delete-folder-list-btn"); // Tlačítko pro smazání v patičce Folders View

  // Selection Buttons (Photos View)
  const toggleSelectionBtn = document.getElementById("toggle-selection-btn");
  const deleteSelectedBtn = document.getElementById("delete-selected-btn");
  const selectionCountSpan = document.getElementById("selection-count");

  // Pagination
  const paginationControls = document.getElementById("pagination-controls");
  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const pageInfo = document.getElementById("page-info");

  // Modals
  const createFolderModal = document.getElementById("create-folder-modal");
  const createFolderForm = document.getElementById("create-folder-form");
  const folderNameInput = document.getElementById("folder-name-input");

  // Rename Modal Elements (NOVÉ)
  const renameFolderModal = document.getElementById("rename-folder-modal");
  const renameFolderForm = document.getElementById("rename-folder-form");
  const renameFolderIdInput = document.getElementById("rename-folder-id-input");
  const newFolderNameInput = document.getElementById("new-folder-name-input");
  const oldFolderNameSpan = document.getElementById("old-folder-name");
  const renameErrorMsg = document.getElementById("rename-error-msg");

  const uploadPhotoModal = document.getElementById("upload-photo-modal");
  const uploadPhotoForm = document.getElementById("upload-photo-form");
  const photoFileInput = document.getElementById("photo-file-input");

  // Admin Delete Modal
  const deleteFolderModal = document.getElementById("delete-folder-modal");
  const deleteFolderForm = document.getElementById("delete-folder-form");
  const deleteConfirmInput = document.getElementById("delete-confirm-input");

  // Upload elements
  const fileChosenText = document.getElementById("file-chosen-text");
  const uploadLoadingOverlay = document.getElementById("upload-loading-overlay");

  // Toast Element
  const successToast = document.getElementById("success-toast");

  // Lightbox Elements
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxDownload = document.getElementById("lightbox-download");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  const lightboxDelete = document.getElementById("lightbox-delete");
  const lightboxDescription = document.getElementById("lightbox-description");
  const addDescriptionBtn = document.getElementById("add-description-btn");
  const descriptionForm = document.getElementById("description-form");
  const descriptionInput = document.getElementById("description-input");
  const saveDescriptionBtn = document.getElementById("save-description-btn");

  // --- State ---
  let currentFolderId = null;
  let currentPage = 1;
  let currentPhotos = [];
  let currentLightboxIndex = 0;
  let allFolders = []; // Ukládání všech složek

  // Selection State
  let isSelectionMode = false;
  let selectedPhotos = new Set();
  let selectedFolderId = null; // ID vybrané složky pro přejmenování/smazání

  const backendUrl = "";

  // Layouts pro mřížku
  const layouts = [
    { classes: ["g-big", "g-wide", "g-wide", "", "", "", ""], itemsCount: 7 },
    { classes: ["g-tall", "g-tall", "g-tall", "g-tall", "", "", "", ""], itemsCount: 8 },
    { classes: ["g-wide", "g-wide", "g-wide", "g-wide", "g-wide", "g-wide"], itemsCount: 6 },
    { classes: ["g-big", "g-tall", "", "", "g-wide", "", ""], itemsCount: 7 },
    { classes: [], itemsCount: 12 },
  ];

  // --- Auth Check — use Common module ---
  const loggedInUsername = Common.username;
  const userRole = Common.role;
  const token = Common.token;

  if (Common.checkAuth(appContainer, authContainer, loggedInUsernameElement)) {
    loadFolders();
  }
  Common.setupLogout(logoutButton);

  // Use shared API helpers from common.js
  const apiFetch = Common.authFetch;
  const showToast = Common.showToast;

  // --- Logic: Folders ---
  async function loadFolders() {
    const folders = await apiFetch(`${backendUrl}/api/gallery/folders`);
    if (folders) {
      allFolders = folders;
      renderFolders(folders);
    }
  }

  function renderFolders(folders) {
    foldersGrid.innerHTML = "";
    if (folders.length === 0) {
      foldersGrid.innerHTML = '<p class="empty-state">Zatím tu nejsou žádná alba. Vytvořte první!</p>';
      return;
    }
    folders.forEach((folder) => {
      const folderEl = document.createElement("div");
      folderEl.className = `folder-card ${folder.id === selectedFolderId ? "selected" : ""}`;
      folderEl.dataset.id = folder.id;

      // Zabraňuje defaultnímu kliku a otevření složky, pokud je vybrán checkbox
      folderEl.onclick = (e) => {
        if (e.target.type !== "checkbox") {
          openFolder(folder.id, folder.name);
        }
      };

      // Checkbox pro výběr
      const checkboxHTML = `
                <div class="folder-checkbox-wrapper">
                    <input type="checkbox" class="folder-checkbox" data-id="${folder.id}" ${folder.id === selectedFolderId ? "checked" : ""}>
                </div>
            `;

      folderEl.innerHTML = `
                ${checkboxHTML}
                <div class="folder-icon"><i class="fas fa-folder"></i></div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <span class="folder-date">Vytvořeno: ${new Date(folder.createdAt).toLocaleDateString()}</span>
                    <span class="folder-owner" style="display:block; font-size:0.8em; color:#6b7280; margin-top: 4px;">Vytvořil: ${folder.createdBy || "Neznámý"}</span>
                </div>
            `;
      foldersGrid.appendChild(folderEl);
    });

    // Musíme znovu navázat posluchače na dynamicky vytvořené checkboxy
    setupFolderCheckboxes();
    updateFolderActionsUI();
  }

  function setupFolderCheckboxes() {
    foldersGrid.querySelectorAll(".folder-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        // Zrušíme výběr všech ostatních (umožníme jen jeden výběr)
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
      renameFolderBtn.style.display = "inline-flex";
      deleteFolderListBtn.style.display = "inline-flex";
    } else {
      renameFolderBtn.style.display = "none";
      deleteFolderListBtn.style.display = "none";
    }
  }

  createFolderBtn.addEventListener("click", () => {
    createFolderModal.style.display = "flex";
    folderNameInput.value = ""; // Reset
    folderNameInput.focus();
  });

  createFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = folderNameInput.value.trim();
    if (!name) {
      showToast("Název alba nesmí být prázdný.", "error");
      return;
    }

    const result = await apiFetch(`${backendUrl}/api/gallery/folders`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (result) {
      createFolderModal.style.display = "none";
      folderNameInput.value = "";
      showToast("Album bylo úspěšně vytvořeno.", "success");
      loadFolders();
    }
  });

  // --- Logika Přejmenování ---
  renameFolderBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;

    const folder = allFolders.find((f) => f.id === selectedFolderId);
    if (!folder) return;

    renameFolderIdInput.value = selectedFolderId;
    newFolderNameInput.value = folder.name;
    oldFolderNameSpan.textContent = folder.name;
    renameErrorMsg.style.display = "none";

    renameFolderModal.style.display = "flex";
    newFolderNameInput.focus();
  });

  renameFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    renameErrorMsg.style.display = "none";
    const newName = newFolderNameInput.value.trim();
    const folderId = renameFolderIdInput.value;

    if (!newName || newName.length < 1) {
      renameErrorMsg.textContent = "Název nesmí být prázdný.";
      renameErrorMsg.style.display = "block";
      return;
    }

    const result = await apiFetch(`${backendUrl}/api/gallery/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });

    if (result) {
      renameFolderModal.style.display = "none";
      selectedFolderId = null; // Zrušíme výběr po úspěšné akci
      showToast("Album bylo úspěšně přejmenováno.", "success");
      loadFolders();
    } else {
      // Chyba se zobrazí automaticky z apiFetch, ale ujistíme se, že je vidět i v modalu
      const folder = allFolders.find((f) => f.id === folderId);
      if (folder && newName.toLowerCase() === folder.name.toLowerCase()) {
        renameErrorMsg.textContent = "Složka s tímto názvem již existuje.";
        renameErrorMsg.style.display = "block";
      }
    }
  });

  // --- Logic: Folder Deletion (z Folders View) ---
  deleteFolderListBtn.addEventListener("click", () => {
    if (!selectedFolderId) return;

    const folder = allFolders.find((f) => f.id === selectedFolderId);
    if (!folder) return;

    // V tomto pohledu nemáme informaci o fotkách, použijeme endpoint, který se o to postará
    // Nicméně zkontrolujeme, zda je album prázdné nebo zda je uživatel admin, pokud nebyly fotky načteny.

    // Zde voláme funkci, která ověří, zda je složka prázdná (nebo zda je admin) a případně zobrazí varování
    performFolderDeleteCheck(selectedFolderId, folder.name);
  });

  // ZÁKLADNÍ LOGIKA MAZÁNÍ PŘES MODAL (původně z photos view, nyní voláme odsud)
  async function performFolderDeleteCheck(folderId, folderName) {
    // Zkontrolujeme, zda je album prázdné
    const photos = await apiFetch(`${backendUrl}/api/gallery/photos?folderId=${folderId}`);
    const isEmpty = photos && photos.length === 0;
    const isAdmin = userRole === "admin";

    if (isEmpty) {
      if (confirm(`Opravdu smazat prázdné album "${folderName}"?`)) {
        performFolderDelete(folderId);
      }
    } else {
      if (!isAdmin) {
        showToast("Album obsahuje fotky. Smazat ho může pouze administrátor.", "error");
        return;
      }
      // Je Admin & Není Prázdné -> Zobrazit Warning Modal
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
      showToast("Musíte napsat přesně 'DELETE' pro potvrzení.", "error");
    }
  });

  async function performFolderDelete(folderId) {
    const result = await apiFetch(`${backendUrl}/api/gallery/folders/${folderId}`, {
      method: "DELETE",
    });
    if (result) {
      showToast("Album a jeho obsah byly smazány.", "success");
      // Jdeme zpět na pohled složek (již jsme tam)
      selectedFolderId = null; // Reset
      loadFolders();
    }
  }

  // --- Logic: Photos ---
  async function openFolder(folderId, folderName) {
    currentFolderId = folderId;
    currentFolderTitle.textContent = folderName;
    currentPage = 1;

    // Reset selection state
    isSelectionMode = false;
    selectedPhotos.clear();
    updateSelectionUI();

    foldersView.style.display = "none";
    photosView.style.display = "flex";
    loadPhotos(folderId);
  }

  backToFoldersBtn.addEventListener("click", () => {
    photosView.style.display = "none";
    foldersView.style.display = "flex";
    currentFolderId = null;
    isSelectionMode = false;
    selectedPhotos.clear();
    selectedFolderId = null; // Důležité: Resetovat při návratu
    loadFolders(); // Znovu načteme složky, aby se obnovil stav
  });

  async function loadPhotos(folderId) {
    const photos = await apiFetch(`${backendUrl}/api/gallery/photos?folderId=${folderId}`);
    if (photos) {
      photos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      currentPhotos = photos;
      renderPhotos();
    }
  }

  function renderPhotos() {
    photosGrid.innerHTML = "";
    if (currentPhotos.length === 0) {
      photosGrid.innerHTML = '<p class="empty-state">Toto album je prázdné. Nahrajte první fotky!</p>';
      paginationControls.style.display = "none";
      return;
    }

    const layoutIndex = (currentPage - 1) % layouts.length;
    const currentLayout = layouts[layoutIndex];

    let startIndex = 0;
    for (let i = 1; i < currentPage; i++) {
      const prevLayout = layouts[(i - 1) % layouts.length];
      startIndex += prevLayout.itemsCount;
    }

    const endIndex = startIndex + currentLayout.itemsCount;
    const pagePhotos = currentPhotos.slice(startIndex, endIndex);

    let tempIndex = 0;
    let totalPages = 0;
    while (tempIndex < currentPhotos.length) {
      const l = layouts[totalPages % layouts.length];
      tempIndex += l.itemsCount;
      totalPages++;
    }

    pagePhotos.forEach((photo, index) => {
      const globalIndex = startIndex + index;
      const photoEl = document.createElement("div");
      photoEl.className = "photo-card";
      if (isSelectionMode && selectedPhotos.has(photo.id)) {
        photoEl.classList.add("selected");
      }

      // Assign grid classes
      if (index < currentLayout.classes.length) {
        const spanClass = currentLayout.classes[index];
        if (spanClass) photoEl.classList.add(spanClass);
      }

      // UPRAVENO: Checkbox/ikona je odstraněna, ponechán prázdný string
      const checkboxHTML = "";

      photoEl.innerHTML = `
                <img src="${photo.thumb || photo.src}" alt="Foto" loading="lazy">
                <div class="photo-overlay"><i class="fas fa-search-plus"></i></div>
                ${checkboxHTML}
            `;

      // Event Listener logic
      photoEl.onclick = (e) => {
        if (isSelectionMode) {
          e.stopPropagation();
          togglePhotoSelection(photo.id, photoEl);
        } else {
          openLightbox(globalIndex);
        }
      };

      photosGrid.appendChild(photoEl);
    });

    // Pagination logic
    if (totalPages > 1) {
      paginationControls.style.display = "flex";
      pageInfo.textContent = `${currentPage} / ${totalPages}`;
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;
    } else {
      paginationControls.style.display = "none";
    }
  }

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPhotos();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    let tempIndex = 0;
    let totalPages = 0;
    while (tempIndex < currentPhotos.length) {
      const l = layouts[totalPages % layouts.length];
      tempIndex += l.itemsCount;
      totalPages++;
    }
    if (currentPage < totalPages) {
      currentPage++;
      renderPhotos();
    }
  });

  // --- Selection Logic ---
  toggleSelectionBtn.addEventListener("click", () => {
    isSelectionMode = !isSelectionMode;
    if (!isSelectionMode) {
      selectedPhotos.clear();
    }
    updateSelectionUI();
    renderPhotos(); // Re-render to show/hide checkboxes
  });

  function updateSelectionUI() {
    if (isSelectionMode) {
      toggleSelectionBtn.classList.add("gallery-btn-primary");
      toggleSelectionBtn.innerHTML = '<i class="fas fa-times"></i> Zrušit výběr';
      deleteSelectedBtn.style.display = "inline-flex";
      selectionCountSpan.textContent = selectedPhotos.size;
    } else {
      toggleSelectionBtn.classList.remove("gallery-btn-primary");
      toggleSelectionBtn.innerHTML = '<i class="fas fa-check-square"></i> Vybrat';
      deleteSelectedBtn.style.display = "none";
    }
  }

  function togglePhotoSelection(photoId, element) {
    if (selectedPhotos.has(photoId)) {
      selectedPhotos.delete(photoId);
      element.classList.remove("selected");
    } else {
      selectedPhotos.add(photoId);
      element.classList.add("selected");
    }
    selectionCountSpan.textContent = selectedPhotos.size;
  }

  deleteSelectedBtn.addEventListener("click", async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`Opravdu smazat ${selectedPhotos.size} vybraných fotek?`)) return;

    const photoIds = Array.from(selectedPhotos);
    const result = await apiFetch(`${backendUrl}/api/gallery/photos`, {
      method: "DELETE",
      body: JSON.stringify({ photoIds }),
    });

    if (result) {
      showToast("Vybrané fotky byly smazány.", "success");
      selectedPhotos.clear();
      isSelectionMode = false;
      updateSelectionUI();
      loadPhotos(currentFolderId);
    }
  });

  // --- Upload Logic ---
  uploadPhotoBtn.addEventListener("click", () => {
    uploadPhotoModal.style.display = "flex";
    photoFileInput.value = "";
    fileChosenText.textContent = "Nevybrán žádný soubor";
    uploadLoadingOverlay.style.display = "none";
  });

  photoFileInput.addEventListener("change", function () {
    if (this.files && this.files.length > 0) {
      if (this.files.length === 1) {
        fileChosenText.textContent = this.files[0].name;
      } else {
        fileChosenText.textContent = `${this.files.length} souborů vybráno`;
      }
    } else {
      fileChosenText.textContent = "Nevybrán žádný soubor";
    }
  });

  uploadPhotoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = photoFileInput.files;
    if (!files.length) return;

    uploadLoadingOverlay.style.display = "flex";
    const uploadButton = uploadPhotoForm.querySelector('button[type="submit"]');
    uploadButton.disabled = true;

    try {
      const formData = new FormData();
      formData.append("folderId", currentFolderId);
      for (const file of Array.from(files)) {
        formData.append("photos", file);
      }

      const response = await fetch(`${backendUrl}/api/gallery/photos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        Common.handleSessionExpired();
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Chyba při nahrávání");
      }

      showToast(`Úspěšně nahráno ${files.length} fotek.`, "success");
    } catch (err) {
      console.error("Chyba při uploadu:", err);
      showToast(err.message || "Chyba při nahrávání fotek.", "error");
    }

    uploadButton.disabled = false;
    uploadLoadingOverlay.style.display = "none";
    uploadPhotoModal.style.display = "none";
    photoFileInput.value = "";

    loadPhotos(currentFolderId);
  });

  // --- Lightbox Logic ---
  function openLightbox(index) {
    currentLightboxIndex = index;
    updateLightboxContent();
    lightboxModal.style.display = "flex";
  }

  function updateLightboxContent() {
    const photo = currentPhotos[currentLightboxIndex];
    if (!photo) return;

    lightboxImg.src = photo.src;
    lightboxDownload.href = photo.src;
    lightboxDownload.setAttribute("download", `foto.jpg`);

    descriptionForm.style.display = "none";
    if (photo.description) {
      lightboxDescription.textContent = photo.description;
      lightboxDescription.style.display = "block";
      addDescriptionBtn.style.display = "none";
    } else {
      lightboxDescription.textContent = "";
      lightboxDescription.style.display = "none";
      addDescriptionBtn.style.display = "block";
    }

    const isOwner = photo.uploadedBy === loggedInUsername;
    const isAdmin = userRole === "admin";

    if (isOwner || isAdmin) {
      lightboxDelete.style.display = "inline-flex";
      lightboxDelete.onclick = () => deletePhoto(photo.id);
    } else {
      lightboxDelete.style.display = "none";
    }
  }

  lightboxDescription.addEventListener("click", showDescriptionForm);
  addDescriptionBtn.addEventListener("click", showDescriptionForm);

  function showDescriptionForm() {
    const photo = currentPhotos[currentLightboxIndex];
    descriptionInput.value = photo.description || "";
    lightboxDescription.style.display = "none";
    addDescriptionBtn.style.display = "none";
    descriptionForm.style.display = "flex";
    descriptionInput.focus();
  }

  saveDescriptionBtn.addEventListener("click", async () => {
    const newDescription = descriptionInput.value.trim();
    const photo = currentPhotos[currentLightboxIndex];
    photo.description = newDescription;
    updateLightboxContent();
    try {
      const result = await apiFetch(`${backendUrl}/api/gallery/photos/${photo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: newDescription }),
      });
      if (result) {
        showToast("Vzpomínka uložena.", "success");
      }
    } catch (e) {
      console.error(e);
    }
  });

  async function deletePhoto(photoId) {
    if (!confirm("Opravdu smazat tuto fotku?")) return;
    const result = await apiFetch(`${backendUrl}/api/gallery/photos/${photoId}`, { method: "DELETE" });
    if (result) {
      showToast("Fotka byla smazána.", "success");
      closeLightbox();
      loadPhotos(currentFolderId);
    }
  }

  function closeLightbox() {
    lightboxModal.style.display = "none";
    lightboxImg.src = "";
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxModal.addEventListener("click", (e) => {
    // Kontrola, zda kliknuto na overlay
    if (e.target.classList.contains("lightbox-overlay")) closeLightbox();
  });
  lightboxPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentLightboxIndex > 0) {
      currentLightboxIndex--;
      updateLightboxContent();
    }
  });
  lightboxNext.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentLightboxIndex < currentPhotos.length - 1) {
      currentLightboxIndex++;
      updateLightboxContent();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (lightboxModal.style.display === "flex") {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxContent();
      }
      if (e.key === "ArrowRight" && currentLightboxIndex < currentPhotos.length - 1) {
        currentLightboxIndex++;
        updateLightboxContent();
      }
    }
  });

  document.querySelectorAll(".modal-close-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-overlay");
      if (modal) modal.style.display = "none";
      // Speciální closery pro modaly
      if (modal.id === "rename-folder-modal") {
        renameFolderForm.reset();
      }
      if (modal.id === "delete-folder-modal") {
        deleteFolderForm.reset();
      }
    });
  });
});

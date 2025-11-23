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
    
    // Pagination
    const paginationControls = document.getElementById("pagination-controls");
    const prevPageBtn = document.getElementById("prev-page-btn");
    const nextPageBtn = document.getElementById("next-page-btn");
    const pageInfo = document.getElementById("page-info");

    // Modals
    const createFolderModal = document.getElementById("create-folder-modal");
    const createFolderForm = document.getElementById("create-folder-form");
    const folderNameInput = document.getElementById("folder-name-input");

    const uploadPhotoModal = document.getElementById("upload-photo-modal");
    const uploadPhotoForm = document.getElementById("upload-photo-form");
    const photoFileInput = document.getElementById("photo-file-input");

    // Lightbox
    const lightboxModal = document.getElementById("lightbox-modal");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxClose = document.getElementById("lightbox-close");
    const lightboxDownload = document.getElementById("lightbox-download");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");
    const lightboxDelete = document.getElementById("lightbox-delete");

    // --- State ---
    let currentFolderId = null;
    let currentPage = 1;
    let photosPerPage = 12; // Bude se dynamicky měnit
    let currentPhotos = [];
    let currentLightboxIndex = 0;

    const backendUrl = ""; 

    // --- Auth Check ---
    const loggedInUsername = localStorage.getItem("username");
    const userRole = localStorage.getItem("role");
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

    // --- Dynamic Layout Logic (2 Řádky) ---
    function calculatePhotosPerPage() {
        if (!photosGrid) return;
        
        // Získáme šířku kontejneru pro fotky
        const gridWidth = photosGrid.clientWidth;
        if (gridWidth === 0) return; // Grid není vidět

        // CSS Grid má minmax(250px, 1fr) a gap 15px
        const minItemWidth = 250; 
        const gap = 15;

        // Vypočítáme, kolik sloupců se vejde na řádek
        // (width + gap) / (item + gap) je zjednodušený vzorec pro auto-fill
        let columns = Math.floor((gridWidth + gap) / (minItemWidth + gap));
        if (columns < 1) columns = 1;

        // Chceme VŽDY přesně 2 řady
        const newPerPage = columns * 2;

        if (newPerPage !== photosPerPage) {
            photosPerPage = newPerPage;
            // Pokud jsme na stránce, která už neexistuje, posuneme se na poslední
            const totalPages = Math.ceil(currentPhotos.length / photosPerPage);
            if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
            
            // Překreslíme fotky s novým limitem
            if (currentFolderId) {
                renderPhotos(currentPhotos); 
            }
        }
    }

    // Sledování změny velikosti okna
    const resizeObserver = new ResizeObserver(() => {
        if (photosView.style.display !== 'none') {
            calculatePhotosPerPage();
        }
    });
    if (photosGrid) resizeObserver.observe(photosGrid);


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
                alert("Sezení vypršelo. Přihlaste se znovu.");
                localStorage.clear();
                window.location.href = "index.html";
                return null;
            }
            if (!response.ok) throw new Error("Chyba serveru");
            return response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // --- Logic: Folders ---

    async function loadFolders() {
        const folders = await apiFetch(`${backendUrl}/api/gallery/folders`);
        if (folders) {
            renderFolders(folders);
        }
    }

    function renderFolders(folders) {
        foldersGrid.innerHTML = '';
        
        if (folders.length === 0) {
            foldersGrid.innerHTML = '<p class="empty-state">Zatím tu nejsou žádná alba. Vytvořte první!</p>';
            return;
        }

        folders.forEach(folder => {
            const folderEl = document.createElement('div');
            folderEl.className = 'folder-card';
            folderEl.onclick = () => openFolder(folder.id, folder.name);
            
            folderEl.innerHTML = `
                <div class="folder-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <span class="folder-date">Vytvořeno: ${new Date(folder.createdAt).toLocaleDateString()}</span>
                </div>
            `;
            foldersGrid.appendChild(folderEl);
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

        const result = await apiFetch(`${backendUrl}/api/gallery/folders`, {
            method: 'POST',
            body: JSON.stringify({ name })
        });

        if (result) {
            createFolderModal.style.display = 'none';
            folderNameInput.value = '';
            loadFolders();
        } else {
            alert("Nepodařilo se vytvořit složku.");
        }
    });

    // --- Logic: Photos ---

    async function openFolder(folderId, folderName) {
        currentFolderId = folderId;
        currentFolderTitle.textContent = folderName;
        currentPage = 1;

        foldersView.style.display = 'none';
        photosView.style.display = 'block';

        // Přepočítat layout hned po zobrazení
        setTimeout(calculatePhotosPerPage, 0);

        loadPhotos(folderId);
    }

    backToFoldersBtn.addEventListener('click', () => {
        photosView.style.display = 'none';
        foldersView.style.display = 'block';
        currentFolderId = null;
    });

    async function loadPhotos(folderId) {
        const photos = await apiFetch(`${backendUrl}/api/gallery/photos?folderId=${folderId}`);
        if (photos) {
            photos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            currentPhotos = photos; // Uložit data
            renderPhotos(photos);   // Vykreslit
        }
    }

    function renderPhotos(photos) {
        photosGrid.innerHTML = '';
        
        // Použití dynamického photosPerPage
        const totalPages = Math.ceil(photos.length / photosPerPage);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        
        const start = (currentPage - 1) * photosPerPage;
        const end = start + photosPerPage;
        const pagePhotos = photos.slice(start, end);

        if (photos.length === 0) {
            photosGrid.innerHTML = '<p class="empty-state">Toto album je prázdné. Nahrajte první fotky!</p>';
            paginationControls.style.display = 'none';
            return;
        }

        pagePhotos.forEach((photo, index) => {
            const globalIndex = start + index;
            const photoEl = document.createElement('div');
            photoEl.className = 'photo-card';
            photoEl.onclick = () => openLightbox(globalIndex);

            photoEl.innerHTML = `
                <img src="${photo.src}" alt="Foto" loading="lazy">
                <div class="photo-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            `;
            photosGrid.appendChild(photoEl);
        });

        // --- Vylepšené Stránkování ---
        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            pageInfo.textContent = `${currentPage} / ${totalPages}`; // Zjednodušený formát
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
            
            // Vizuální stavy tlačítek
            updateButtonState(prevPageBtn, currentPage === 1);
            updateButtonState(nextPageBtn, currentPage === totalPages);
        } else {
            paginationControls.style.display = 'none';
        }
    }

    function updateButtonState(btn, isDisabled) {
        if (isDisabled) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'default';
            btn.style.backgroundColor = '#f3f4f6';
            btn.style.color = '#ccc';
            btn.style.borderColor = '#e5e7eb';
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = ''; // Reset na CSS hover efekty
            btn.style.color = '';
            btn.style.borderColor = '';
        }
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPhotos(currentPhotos);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentPhotos.length / photosPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPhotos(currentPhotos);
        }
    });

    // --- Upload Logic ---

    uploadPhotoBtn.addEventListener('click', () => {
        uploadPhotoModal.style.display = 'flex';
    });

    uploadPhotoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = photoFileInput.files;
        if (!files.length) return;

        const uploadButton = uploadPhotoForm.querySelector('button[type="submit"]');
        uploadButton.disabled = true;
        uploadButton.textContent = "Nahrávám...";

        for (const file of Array.from(files)) {
            try {
                const base64 = await toBase64(file);
                await apiFetch(`${backendUrl}/api/gallery/photos`, {
                    method: 'POST',
                    body: JSON.stringify({
                        folderId: currentFolderId,
                        imageBase64: base64
                    })
                });
            } catch (err) {
                console.error("Chyba při uploadu:", err);
                alert(`Nepodařilo se nahrát soubor ${file.name}`);
            }
        }

        uploadButton.disabled = false;
        uploadButton.textContent = "Nahrát";
        uploadPhotoModal.style.display = 'none';
        photoFileInput.value = '';
        loadPhotos(currentFolderId);
    });

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    // --- Lightbox Logic ---

    function openLightbox(index) {
        currentLightboxIndex = index;
        updateLightboxContent();
        lightboxModal.style.display = 'flex';
    }

    function updateLightboxContent() {
        const photo = currentPhotos[currentLightboxIndex];
        if (!photo) return;

        lightboxImg.src = photo.src;
        lightboxDownload.href = photo.src;
        lightboxDownload.setAttribute('download', `foto.jpg`);

        const isOwner = photo.uploadedBy === loggedInUsername;
        const isAdmin = userRole === 'admin';
        
        if (isOwner || isAdmin) {
            lightboxDelete.style.display = 'inline-block';
            lightboxDelete.onclick = () => deletePhoto(photo.id);
        } else {
            lightboxDelete.style.display = 'none';
        }
    }

    async function deletePhoto(photoId) {
        if(!confirm("Opravdu smazat tuto fotku?")) return;
        
        const result = await apiFetch(`${backendUrl}/api/gallery/photos/${photoId}`, {
            method: 'DELETE'
        });

        if (result) {
            closeLightbox();
            loadPhotos(currentFolderId);
        } else {
            alert("Nepodařilo se smazat fotku.");
        }
    }

    function closeLightbox() {
        lightboxModal.style.display = 'none';
        lightboxImg.src = '';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) closeLightbox();
    });

    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentLightboxIndex > 0) {
            currentLightboxIndex--;
            updateLightboxContent();
        }
    });

    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentLightboxIndex < currentPhotos.length - 1) {
            currentLightboxIndex++;
            updateLightboxContent();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (lightboxModal.style.display === 'flex') {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft' && currentLightboxIndex > 0) {
                currentLightboxIndex--;
                updateLightboxContent();
            }
            if (e.key === 'ArrowRight' && currentLightboxIndex < currentPhotos.length - 1) {
                currentLightboxIndex++;
                updateLightboxContent();
            }
        }
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        });
    });
    document.querySelectorAll('.modal-close-button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').style.display = 'none';
        });
    });
});
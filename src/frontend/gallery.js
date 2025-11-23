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
    let photosPerPage = 12; // Defaultně 12
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
        
        // Pevný počet fotek na stránku pro konzistentní layout
        photosPerPage = 12; 

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

        // --- DEFINICE VZORŮ (LAYOUT PATTERNS) ---
        // 'g-big' = 2x2, 'g-wide' = 2x1, 'g-tall' = 1x2, '' nebo 'g-normal' = 1x1
        const layouts = [
            // Layout 1: Důraz na velké fotky
            ['g-big', '', 'g-tall', '', 'g-wide', '', '', 'g-big', '', 'g-tall'],
            
            // Layout 2: Panoramatický styl (více wide)
            ['g-wide', 'g-wide', '', '', 'g-big', '', '', 'g-wide', '', ''],
            
            // Layout 3: Vertikální rytmus
            ['g-tall', '', '', 'g-big', '', 'g-wide', 'g-tall', '', '', '']
        ];

        // Vybereme layout podle čísla stránky (cyklování 0, 1, 2)
        const currentLayoutPattern = layouts[(currentPage - 1) % layouts.length];

        pagePhotos.forEach((photo, index) => {
            const globalIndex = start + index;
            const photoEl = document.createElement('div');
            
            // Základní třída
            photoEl.className = 'photo-card';
            
            // Aplikace moderní třídy podle vzoru
            // Použijeme index v rámci stránky (0 až 11) a modulo délkou vzoru, aby se nevyčerpal
            const spanClass = currentLayoutPattern[index % currentLayoutPattern.length];
            if (spanClass) {
                photoEl.classList.add(spanClass);
            }

            photoEl.onclick = () => openLightbox(globalIndex);

            photoEl.innerHTML = `
                <img src="${photo.src}" alt="Foto" loading="lazy">
                <div class="photo-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            `;
            photosGrid.appendChild(photoEl);
        });

        // --- Stránkování ---
        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
            
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
            btn.style.backgroundColor = ''; 
            btn.style.color = '';
            btn.style.borderColor = '';
        }
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPhotos(currentPhotos);
            // Scroll nahoru při změně stránky
            document.querySelector('.gallery-card').scrollIntoView({ behavior: 'smooth' });
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentPhotos.length / photosPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPhotos(currentPhotos);
            document.querySelector('.gallery-card').scrollIntoView({ behavior: 'smooth' });
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
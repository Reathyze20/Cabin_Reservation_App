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
    const photosPerPage = 12; // Počet fotek na stránku
    let currentPhotos = []; // Data aktuálně zobrazených fotek
    let currentLightboxIndex = 0;

    const backendUrl = ""; 

    // --- Auth Check ---
    const loggedInUsername = localStorage.getItem("username");
    const userRole = localStorage.getItem("role");

    if (loggedInUsername) {
        appContainer.classList.remove("hidden");
        authContainer.classList.add("hidden");
        if (loggedInUsernameElement) loggedInUsernameElement.textContent = loggedInUsername;
        loadFolders(); // Start app
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

    // --- Mock Data Helper (Simulace Backendu) ---
    // Pokud API neexistuje, použijeme localStorage pro ukázku
    function getMockData(key) {
        return JSON.parse(localStorage.getItem(key)) || [];
    }
    function setMockData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- Logic: Folders ---

    async function loadFolders() {
        // Zde by byl fetch(`${backendUrl}/api/gallery/folders`)
        // Simulace:
        let folders = getMockData('gallery_folders');
        if (folders.length === 0) {
            // Defaultní složky pro demo
            folders = [
                { id: '1', name: 'Léto 2024', createdAt: new Date().toISOString() },
                { id: '2', name: 'Silvestr', createdAt: new Date().toISOString() }
            ];
            setMockData('gallery_folders', folders);
        }

        renderFolders(folders);
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

    createFolderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = folderNameInput.value.trim();
        if (!name) return;

        // Simulace vytvoření složky
        const folders = getMockData('gallery_folders');
        const newFolder = {
            id: Date.now().toString(),
            name: name,
            createdAt: new Date().toISOString()
        };
        folders.push(newFolder);
        setMockData('gallery_folders', folders);

        createFolderModal.style.display = 'none';
        folderNameInput.value = '';
        loadFolders();
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
        // Zde by byl fetch(`${backendUrl}/api/gallery/folders/${folderId}/photos`)
        // Simulace:
        let allPhotos = getMockData('gallery_photos');
        // Filtrujeme fotky pro aktuální složku
        let folderPhotos = allPhotos.filter(p => p.folderId === folderId);
        
        // Seřadit od nejnovějších
        folderPhotos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        renderPhotos(folderPhotos);
    }

    function renderPhotos(photos) {
        photosGrid.innerHTML = '';
        currentPhotos = photos; // Uložit pro lightbox

        // Pagination Logic
        const totalPages = Math.ceil(photos.length / photosPerPage);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        
        const start = (currentPage - 1) * photosPerPage;
        const end = start + photosPerPage;
        const pagePhotos = photos.slice(start, end);

        if (photos.length === 0) {
            photosGrid.innerHTML = '<p class="empty-state">Toto album je prázdné. Nahrajte první fotky!</p>';
            paginationControls.style.display = 'none';
            return;
        }

        pagePhotos.forEach((photo, index) => {
            // index v rámci stránky, potřebujeme globální index pro lightbox
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

        // Render Pagination Controls
        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            pageInfo.textContent = `Strana ${currentPage} z ${totalPages}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
            
            // Update styles for disabled buttons
            prevPageBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
            prevPageBtn.style.cursor = currentPage === 1 ? 'default' : 'pointer';
            nextPageBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
            nextPageBtn.style.cursor = currentPage === totalPages ? 'default' : 'pointer';

        } else {
            paginationControls.style.display = 'none';
        }
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadPhotos(currentFolderId);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentPhotos.length / photosPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            loadPhotos(currentFolderId);
        }
    });

    // --- Upload Logic ---

    uploadPhotoBtn.addEventListener('click', () => {
        uploadPhotoModal.style.display = 'flex';
    });

    uploadPhotoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const files = photoFileInput.files;
        if (!files.length) return;

        // Simulace nahrávání (konverze na Base64 pro localStorage - pozor na limit!)
        // V reálu by se posílal FormData na server
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const allPhotos = getMockData('gallery_photos');
                allPhotos.push({
                    id: Date.now() + Math.random().toString(),
                    folderId: currentFolderId,
                    src: event.target.result, // Base64
                    createdAt: new Date().toISOString(),
                    uploadedBy: loggedInUsername
                });
                setMockData('gallery_photos', allPhotos);
                
                // Refresh po poslední fotce (zjednodušeně)
                if (file === files[files.length - 1]) {
                    uploadPhotoModal.style.display = 'none';
                    photoFileInput.value = '';
                    loadPhotos(currentFolderId);
                }
            };
            reader.readAsDataURL(file);
        });
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
        lightboxDownload.href = photo.src; // Umožní stažení
        lightboxDownload.setAttribute('download', `foto_${photo.id}.jpg`);

        // Mazání povoleno jen adminovi nebo vlastníkovi
        const isOwner = photo.uploadedBy === loggedInUsername;
        const isAdmin = userRole === 'admin';
        
        if (isOwner || isAdmin) {
            lightboxDelete.style.display = 'inline-block';
            lightboxDelete.onclick = () => deletePhoto(photo.id);
        } else {
            lightboxDelete.style.display = 'none';
        }
    }

    function deletePhoto(photoId) {
        if(!confirm("Opravdu smazat tuto fotku?")) return;
        
        let allPhotos = getMockData('gallery_photos');
        allPhotos = allPhotos.filter(p => p.id !== photoId);
        setMockData('gallery_photos', allPhotos);
        
        closeLightbox();
        loadPhotos(currentFolderId);
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

    // Klávesové zkratky pro galerii
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
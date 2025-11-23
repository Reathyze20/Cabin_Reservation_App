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

    // Lightbox Elements
    const lightboxModal = document.getElementById("lightbox-modal");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxClose = document.getElementById("lightbox-close");
    const lightboxDownload = document.getElementById("lightbox-download");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");
    const lightboxDelete = document.getElementById("lightbox-delete");
    
    // Lightbox Description (Vzpomínky)
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

    const backendUrl = ""; 

    // --- DEFINICE LAYOUTŮ (Perfect Fit) ---
    // Každý pattern má součet velikostí buněk 12 (4 sloupce x 3 řádky)
    const layouts = [
        {
            // Layout A: 1 velká (4), 2 široké (4), 4 malé (4) = 12
            classes: ['g-big', 'g-wide', 'g-wide', '', '', '', ''],
            itemsCount: 7
        },
        {
            // Layout B: 4 vysoké (8), 4 malé (4) = 12
            classes: ['g-tall', 'g-tall', 'g-tall', 'g-tall', '', '', '', ''],
            itemsCount: 8
        },
        {
            // Layout C: 6 širokých (12) = 12
            classes: ['g-wide', 'g-wide', 'g-wide', 'g-wide', 'g-wide', 'g-wide'],
            itemsCount: 6
        },
        {
            // Layout D: Mozaika
            classes: ['g-big', 'g-tall', '', '', 'g-wide', '', ''],
            itemsCount: 7
        },
        {
            // Layout E: Klasika (12 malých)
            classes: [],
            itemsCount: 12
        }
    ];

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
            console.error("API Error:", error);
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
        photosView.style.display = 'flex'; 

        loadPhotos(folderId);
    }

    backToFoldersBtn.addEventListener('click', () => {
        photosView.style.display = 'none';
        foldersView.style.display = 'flex';
        currentFolderId = null;
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
        photosGrid.innerHTML = '';

        if (currentPhotos.length === 0) {
            photosGrid.innerHTML = '<p class="empty-state">Toto album je prázdné. Nahrajte první fotky!</p>';
            paginationControls.style.display = 'none';
            return;
        }

        // Výpočet layoutu a stránkování
        const layoutIndex = (currentPage - 1) % layouts.length;
        const currentLayout = layouts[layoutIndex];
        
        // Spočítáme start index na základě kapacit předchozích stránek
        let startIndex = 0;
        for (let i = 1; i < currentPage; i++) {
            const prevLayout = layouts[(i - 1) % layouts.length];
            startIndex += prevLayout.itemsCount;
        }

        const endIndex = startIndex + currentLayout.itemsCount;
        const pagePhotos = currentPhotos.slice(startIndex, endIndex);

        // Spočítáme celkový počet stránek
        let tempIndex = 0;
        let totalPages = 0;
        while (tempIndex < currentPhotos.length) {
            const l = layouts[totalPages % layouts.length];
            tempIndex += l.itemsCount;
            totalPages++;
        }

        // Vykreslení
        pagePhotos.forEach((photo, index) => {
            const globalIndex = startIndex + index;
            const photoEl = document.createElement('div');
            
            photoEl.className = 'photo-card';
            
            if (index < currentLayout.classes.length) {
                const spanClass = currentLayout.classes[index];
                if (spanClass) {
                    photoEl.classList.add(spanClass);
                }
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

        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
        } else {
            paginationControls.style.display = 'none';
        }
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPhotos();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        // Přepočítat totalPages
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

    // --- Lightbox Logic (Vzpomínky) ---

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

        // Zobrazení popisu (Vzpomínky)
        descriptionForm.style.display = 'none';
        
        if (photo.description) {
            lightboxDescription.textContent = photo.description;
            lightboxDescription.style.display = 'block';
            addDescriptionBtn.style.display = 'none';
        } else {
            lightboxDescription.textContent = '';
            lightboxDescription.style.display = 'none';
            addDescriptionBtn.style.display = 'block';
        }

        // Ovládání pro mazání
        const isOwner = photo.uploadedBy === loggedInUsername;
        const isAdmin = userRole === 'admin';
        
        if (isOwner || isAdmin) {
            lightboxDelete.style.display = 'inline-flex'; 
            lightboxDelete.onclick = () => deletePhoto(photo.id);
        } else {
            lightboxDelete.style.display = 'none';
        }
    }

    // Editace popisu
    lightboxDescription.addEventListener('click', () => {
        showDescriptionForm();
    });

    addDescriptionBtn.addEventListener('click', () => {
        showDescriptionForm();
    });

    function showDescriptionForm() {
        const photo = currentPhotos[currentLightboxIndex];
        descriptionInput.value = photo.description || '';
        
        lightboxDescription.style.display = 'none';
        addDescriptionBtn.style.display = 'none';
        descriptionForm.style.display = 'flex';
        descriptionInput.focus();
    }

    // Uložení popisu (PATCH na server)
    saveDescriptionBtn.addEventListener('click', async () => {
        const newDescription = descriptionInput.value.trim();
        const photo = currentPhotos[currentLightboxIndex];

        // Optimistický update
        photo.description = newDescription;
        updateLightboxContent();

        // Odeslání na server
        try {
            await apiFetch(`${backendUrl}/api/gallery/photos/${photo.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ description: newDescription })
            });
        } catch (e) {
            console.error("Nepodařilo se uložit popis:", e);
            alert("Chyba při ukládání popisu.");
        }
    });

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

    document.querySelectorAll('.modal-close-button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').style.display = 'none';
        });
    });
});
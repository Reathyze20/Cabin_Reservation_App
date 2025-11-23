document.addEventListener("DOMContentLoaded", () => {
    // 1. Elementy DOM
    const appContainer = document.getElementById("app-container");
    const loggedInUsernameElement = document.getElementById("logged-in-username");
    const logoutButton = document.getElementById("logout-button");
    const uploadForm = document.getElementById("upload-form");
    const photoUpload = document.getElementById("photo-upload");
    const gallery = document.getElementById("gallery");

    // 2. Kontrola přihlášení
    const loggedInUsername = localStorage.getItem("username");

    if (!loggedInUsername) {
        // Pokud není přihlášen, přesměrovat na login
        window.location.href = "index.html";
        return; 
    }

    // Uživatel je přihlášen -> zobrazit jméno
    if (loggedInUsernameElement) {
        loggedInUsernameElement.textContent = loggedInUsername;
    }

    // 3. Funkčnost odhlášení
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("username");
            window.location.href = "index.html";
        });
    }

    // 4. Logika nahrávání fotek (Lokální náhled)
    if (uploadForm) {
        uploadForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const file = photoUpload.files[0];
            if (!file) {
                alert("Vyberte prosím fotku k nahrání.");
                return;
            }

            // Použití FileReader pro zobrazení náhledu bez serveru
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgContainer = document.createElement("div");
                imgContainer.style.margin = "10px";
                imgContainer.style.display = "inline-block";

                const img = document.createElement("img");
                img.src = e.target.result;
                img.alt = "Nahraná fotka";
                
                // Stylování přímo zde nebo spoléhání na CSS třídy
                img.style.maxWidth = "300px";
                img.style.maxHeight = "200px";
                img.style.objectFit = "cover";
                img.style.borderRadius = "8px";
                img.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                
                imgContainer.appendChild(img);
                gallery.appendChild(imgContainer);
            };

            reader.readAsDataURL(file);
            
            // Reset formuláře
            uploadForm.reset();
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("upload-form");
    const photoUpload = document.getElementById("photo-upload");
    const gallery = document.getElementById("gallery");

    uploadForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const file = photoUpload.files[0];
        if (!file) {
            alert("Vyberte prosím fotku k nahrání.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.alt = "Nahraná fotka";
            gallery.appendChild(img);
        };

        reader.readAsDataURL(file);
        uploadForm.reset();
    });
});
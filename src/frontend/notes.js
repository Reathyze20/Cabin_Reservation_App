document.addEventListener("DOMContentLoaded", () => {
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");
    const loggedInUsername = localStorage.getItem("username");

    if (loggedInUsername) {
        appContainer.classList.remove("hidden");
        authContainer.classList.add("hidden");
        const welcomeMessage = document.getElementById("welcome-message");
        if (welcomeMessage) {
            welcomeMessage.textContent = `Přihlášen jako: ${loggedInUsername}`;
        }
    } else {
        appContainer.classList.add("hidden");
        authContainer.classList.remove("hidden");
    }
});
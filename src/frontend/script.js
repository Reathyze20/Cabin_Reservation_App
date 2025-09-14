document.addEventListener("DOMContentLoaded", () => {
  // Mapa barev uživatelů
  const userColors = {
    user1: "#FFD700",
    user2: "#FFA500",
  };

  // Odkazy na HTML elementy (zkráceno pro přehlednost)
  const loginSection = document.getElementById("login-section");
  const appSection = document.getElementById("app-section");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginError = document.getElementById("login-error");

  const registerSection = document.getElementById("register-section");
  const registerForm = document.getElementById("register-form");
  const registerMessage = document.getElementById("register-message");
  const showRegisterLink = document.getElementById("show-register-link");
  const showLoginLink = document.getElementById("show-login-link");

  const loggedInUsernameSpan = document.getElementById("logged-in-username");
  const logoutButton = document.getElementById("logout-button");
  const bookingForm = document.getElementById("booking-form");
  const bookingMessage = document.getElementById("booking-message");
  const reservationsListDiv = document.getElementById("reservations-list");
  const calendarContainer = document.querySelector(".calendar-container"); // Uložíme si ho jednou

  // Globální proměnné
  let flatpickrInstance = null; // Proměnná pro instanci Flatpickr
  window.currentReservations = []; // Pole pro načtené rezervace
  const backendUrl = "http://localhost:3000";

  // --- Funkce pro zobrazení/skrytí sekcí ---
  function showLogin() {
    loginSection.style.display = "block";
    registerSection.style.display = "none";
    appSection.style.display = "none";
    loginError.textContent = "";
  }

  function showRegister() {
    loginSection.style.display = "none";
    registerSection.style.display = "block";
    appSection.style.display = "none";
    registerMessage.textContent = "";
  }

  function showApp(username) {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    appSection.style.display = "flex";
    loggedInUsernameSpan.textContent = username;
    // ZAVOLÁME POUZE loadReservations, KTERÝ SE POSTARÁ O ZBYTEK
    loadReservations();
  }

  // --- Logika Přepínání Formulářů ---
  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    showRegister();
  });

  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showLogin();
  });

  // --- Logika Přihlášení ---
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (!username || !password) {
      loginError.textContent = "Prosím, vyplňte jméno i heslo.";
      return;
    }
    try {
      const response = await fetch(`${backendUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || `Chyba ${response.status}`);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("username", data.username);
      showApp(data.username);
    } catch (error) {
      console.error("Chyba při přihlášení:", error);
      loginError.textContent = error.message || "Nepodařilo se přihlásit.";
      passwordInput.value = "";
    }
  });

  // --- Logika Registrace ---
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerMessage.textContent = "";
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    if (!username || !password) {
      registerMessage.textContent = "Prosím, vyplňte jméno i heslo.";
      registerMessage.style.color = "red";
      return;
    }
    if (password.length < 6) {
      registerMessage.textContent = "Heslo musí mít alespoň 6 znaků.";
      registerMessage.style.color = "red";
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Chyba ${response.status}`);
      }

      registerMessage.textContent = data.message;
      registerMessage.style.color = "green";
      registerForm.reset();
      
      // Po úspěšné registraci přepne zpět na přihlášení
      setTimeout(() => {
        showLogin();
      }, 2000);
    } catch (error) {
      console.error("Chyba při registraci:", error);
      registerMessage.textContent = error.message || "Nepodařilo se zaregistrovat.";
      registerMessage.style.color = "red";
    }
  });

  // --- Logika Odhlášení ---
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    if (flatpickrInstance) {
      flatpickrInstance.destroy();
      flatpickrInstance = null;
    }
    window.currentReservations = []; // Vyčistit i data rezervací
    showLogin();
  });

  // --- Inicializace Aplikace ---

  function getToken() {
    return localStorage.getItem("authToken");
  }

  // Inicializace Flatpickr
  function initializeDatePicker(disabledDates = []) {
    console.log("--- initializeDatePicker START ---");

    if (!calendarContainer) {
      console.error(
        "   -> KRITICKÁ CHYBA: Element .calendar-container nebyl nalezen!"
      );
      return;
    }

    const flatpickrConfig = {
      mode: "range",
      dateFormat: "Y-m-d",
      inline: true,
      disable: disabledDates,
      minDate: "today",
      locale: "cs",
      onReady: function (selectedDates, dateStr, instance) {
        console.log("   -> Flatpickr onReady: Kalendář je připraven.");
      },
      onMonthChange: function (selectedDates, dateStr, instance) {
        console.log("   -> Flatpickr onMonthChange.");
        renderReservationsOverview(instance.currentMonth, instance.currentYear);
      },
      onYearChange: function (selectedDates, dateStr, instance) {
        console.log("   -> Flatpickr onYearChange.");
        renderReservationsOverview(instance.currentMonth, instance.currentYear);
      },
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        const currentDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        );
        currentDate.setHours(0, 0, 0, 0);
        const currentTimestamp = currentDate.getTime();

        if (
          !window.currentReservations ||
          window.currentReservations.length === 0
        )
          return;

        const matchingReservations = window.currentReservations.filter((r) => {
          try {
            const fromParts = r.from.split("-").map(Number);
            const toParts = r.to.split("-").map(Number);
            if (
              fromParts.length !== 3 ||
              toParts.length !== 3 ||
              fromParts.some(isNaN) ||
              toParts.some(isNaN)
            )
              return false;
            const resStart = new Date(
              fromParts[0],
              fromParts[1] - 1,
              fromParts[2]
            );
            const resEnd = new Date(toParts[0], toParts[1] - 1, toParts[2]);
            resStart.setHours(0, 0, 0, 0);
            resEnd.setHours(0, 0, 0, 0);
            return (
              currentTimestamp >= resStart.getTime() &&
              currentTimestamp <= resEnd.getTime()
            );
          } catch (e) {
            return false;
          }
        });

        if (matchingReservations.length > 0) {
          const reservation = matchingReservations[0];
          if (!reservation.userId || !reservation.username) return;

          const userColor = userColors[reservation.userId];
          dayElem.title = `Rezervováno: ${reservation.username}`;
          dayElem.classList.add("booked-day");

          if (userColor) {
            dayElem.classList.add(`user-${reservation.userId}`);
          } else {
            dayElem.classList.add("booked-unknown-user");
          }
        }
      },
      onChange: function (selectedDates, dateStr, instance) {
        const checkInDateDisplay = document.getElementById(
          "check-in-date-display"
        );
        const checkOutDateDisplay = document.getElementById(
          "check-out-date-display"
        );
        if (!checkInDateDisplay || !checkOutDateDisplay) return;
        if (selectedDates.length >= 1) {
          checkInDateDisplay.textContent = instance.formatDate(
            selectedDates[0],
            "d. M Y"
          );
          if (selectedDates.length === 2) {
            checkOutDateDisplay.textContent = instance.formatDate(
              selectedDates[1],
              "d. M Y"
            );
          } else {
            checkOutDateDisplay.textContent = "- Vyberte -";
          }
        } else {
          checkInDateDisplay.textContent = "- Vyberte -";
          checkOutDateDisplay.textContent = "- Vyberte -";
        }
      },
    };

    console.log(
      "   -> Volám flatpickr('.calendar-container', flatpickrConfig)..."
    );
    try {
      flatpickrInstance = flatpickr(calendarContainer, flatpickrConfig);
      console.log("   -> Flatpickr instance vytvořena:", flatpickrInstance);
      if (!flatpickrInstance) {
        console.error(
          "   -> !!! CHYBA: flatpickr() vrátil null nebo undefined!"
        );
      }
    } catch (e) {
      console.error(
        "   -> !!! KRITICKÁ CHYBA při volání flatpickr() inicializace:",
        e
      );
      flatpickrInstance = null;
    }
    console.log("--- initializeDatePicker END ---");
  }

  // Načtení a zobrazení rezervací
  async function loadReservations() {
    if (reservationsListDiv)
      reservationsListDiv.innerHTML = "<p><i>Aktualizuji rezervace...</i></p>";
    else
      console.warn(
        "Element reservationsListDiv nenalezen pro zobrazení stavu načítání."
      );

    const token = getToken();
    if (!token) {
      showLogin();
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        console.warn("Neautorizovaný přístup k rezervacím, odhlašuji.");
        logoutButton.click();
        return;
      }
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Chyba ${response.status}` }));
        throw new Error(
          errorData.message ||
            `Chyba při načítání rezervací: ${response.status}`
        );
      }

      const rezervace = await response.json();
      window.currentReservations = rezervace;
      console.log(
        "Aktuální rezervace načteny/aktualizovány:",
        window.currentReservations
      );

      const disabledRanges = rezervace.map((r) => ({ from: r.from, to: r.to }));

      if (flatpickrInstance) {
        console.log(">>> Aktualizuji existující Flatpickr instanci.");
        flatpickrInstance.set("disable", disabledRanges);
        console.log(
          ">>> Volám renderReservationsOverview po aktualizaci instance."
        );
        renderReservationsOverview(
          flatpickrInstance.currentMonth,
          flatpickrInstance.currentYear
        );
      } else {
        console.log(">>> Inicializuji novou Flatpickr instanci.");
        initializeDatePicker(disabledRanges);

        setTimeout(() => {
          if (flatpickrInstance) {
            console.log(
              ">>> Ruční první render přehledu po nové inicializaci."
            );
            renderReservationsOverview(
              flatpickrInstance.currentMonth,
              flatpickrInstance.currentYear
            );
          } else {
            console.error(
              "!!! Instance Flatpickr není dostupná ani po nové inicializaci!"
            );
          }
        }, 50);
      }
    } catch (error) {
      console.error("Chyba při načítání/aktualizaci rezervací:", error);
      if (reservationsListDiv)
        reservationsListDiv.innerHTML = `<p style="color: red;">Nepodařilo se aktualizovat rezervace.</p>`;
    }
  }

  function formatDateForDisplay(dateString) {
    if (!dateString || typeof dateString !== "string") return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    bookingMessage.textContent = "Odesílám rezervaci...";
    bookingMessage.style.color = "";

    const token = getToken();
    console.log("Submit handler: Token nalezen?", !!token);

    console.log("Submit handler: Instance FP existuje?", !!flatpickrInstance);
    if (flatpickrInstance) {
      console.log(
        "Submit handler: Počet vybraných dat:",
        flatpickrInstance.selectedDates.length
      );
    }

    if (!flatpickrInstance || flatpickrInstance.selectedDates.length !== 2) {
      console.log(
        "Submit handler: KONEC - Instance neexistuje nebo nejsou vybrány 2 datumy."
      );
      bookingMessage.textContent = "Prosím, vyberte platný termín (od - do).";
      bookingMessage.style.color = "red";
      return;
    }

    if (!token) {
      console.log("Submit handler: KONEC - Token nenalezen (druhá kontrola).");
      bookingMessage.textContent = "Chyba: Nejste přihlášeni.";
      bookingMessage.style.color = "red";
      logoutButton.click();
      return;
    }

    const rezervaceData = {
      from: flatpickrInstance.formatDate(
        flatpickrInstance.selectedDates[0],
        "Y-m-d"
      ),
      to: flatpickrInstance.formatDate(
        flatpickrInstance.selectedDates[1],
        "Y-m-d"
      ),
    };
    console.log("Submit handler: Data pro odeslání připravena:", rezervaceData);

    console.log("Submit handler: Pokouším se volat fetch POST...");
    try {
      const response = await fetch(`${backendUrl}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rezervaceData),
      });
      console.log(
        "Submit handler: Fetch POST dokončen, status:",
        response.status
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Chyba ${response.status}`);
      }
      bookingMessage.textContent = `Rezervace úspěšně vytvořena!`;
      bookingMessage.style.color = "green";
      flatpickrInstance.clear();
      document.getElementById("check-in-date-display").textContent =
        "- Vyberte -";
      document.getElementById("check-out-date-display").textContent =
        "- Vyberte -";
      loadReservations();
    } catch (error) {
      console.error("Submit handler: Chyba v try bloku:", error);
      bookingMessage.textContent = `Chyba: ${error.message}`;
      bookingMessage.style.color = "red";
    } finally {
      console.log("Submit handler: Konec zpracování (finally).");
    }
  });

  function renderReservationsOverview(month, year) {
    const reservationsContainer = document.getElementById("reservations-list");
    if (!reservationsContainer) return;
    if (!window.currentReservations) {
      reservationsContainer.innerHTML = "<p><i>Rezervace nenalezeny.</i></p>";
      return;
    }
    const monthStart = new Date(year, month, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0);
    monthEnd.setHours(0, 0, 0, 0);
    console.log(`>>> Renderuji přehled pro ${month + 1}/${year}`);

    const filteredReservations = window.currentReservations.filter((r) => {
      try {
        const fromParts = r.from.split("-").map(Number);
        const toParts = r.to.split("-").map(Number);
        if (
          fromParts.length !== 3 ||
          toParts.length !== 3 ||
          fromParts.some(isNaN) ||
          toParts.some(isNaN)
        )
          return false;
        const resStart = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
        resStart.setHours(0, 0, 0, 0);
        const resEnd = new Date(toParts[0], toParts[1] - 1, toParts[2]);
        resEnd.setHours(0, 0, 0, 0);
        return resStart <= monthEnd && resEnd >= monthStart;
      } catch (e) {
        return false;
      }
    });

    reservationsContainer.innerHTML = "";
    if (filteredReservations.length === 0) {
      reservationsContainer.innerHTML =
        "<p><i>Pro tento měsíc nejsou žádné rezervace.</i></p>";
    } else {
      filteredReservations.sort((a, b) => new Date(a.from) - new Date(b.from));
      const list = document.createElement("ul");
      filteredReservations.forEach((r) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${r.username}: ${formatDateForDisplay(
          r.from
        )} - ${formatDateForDisplay(r.to)}`;
        list.appendChild(listItem);
      });
      reservationsContainer.appendChild(list);
    }
  }

  // --- Spuštění při načtení stránky ---
  const initialToken = getToken();
  const initialUsername = localStorage.getItem("username");
  if (initialToken && initialUsername) {
    console.log("Nalezen token a username, volám showApp.");
    showApp(initialUsername);
  } else {
    console.log("Token nebo username nenalezeno, volám showLogin.");
    showLogin();
  }
});

// --- END OF FILE script.js ---




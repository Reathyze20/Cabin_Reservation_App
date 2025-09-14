document.addEventListener("DOMContentLoaded", () => {
  // Mapa barev uživatelů
  const userColors = {
    user1: "#FFD700",
    user2: "#FFA500",
  };

  // Odkazy na HTML elementy
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
  const reservationsListDiv = document.getElementById("reservations-list");
  const calendarContainer = document.querySelector(".calendar-container");
  const reservationsContainerTitle = document.querySelector(".reservations-list-container h2");
  
  // Prvky pro modální okno
  const bookingModal = document.getElementById("booking-modal");
  const closeModalButton = document.querySelector(".modal-close-button");
  const openModalButton = document.getElementById("open-booking-modal-button");
  const bookingForm = document.getElementById("booking-form");
  const bookingMessage = document.getElementById("booking-message");
  const modalDateRangeSpan = document.getElementById("modal-date-range");
  const purposeSelect = document.getElementById("purpose-select");
  const otherPurposeGroup = document.getElementById("other-purpose-group");
  const otherPurposeInput = document.getElementById("other-purpose-input");
  const notesTextarea = document.getElementById("notes-textarea");


  // Globální proměnné
  let flatpickrInstance = null;
  window.currentReservations = [];
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Chyba ${response.status}`);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Chyba ${response.status}`);
      
      registerMessage.textContent = data.message;
      registerMessage.style.color = "green";
      registerForm.reset();
      
      setTimeout(() => { showLogin(); }, 2000);
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
    window.currentReservations = [];
    showLogin();
  });
  
  // --- MODÁLNÍ OKNO LOGIKA ---
  function openBookingModal() {
      if (flatpickrInstance && flatpickrInstance.selectedDates.length === 2) {
          const from = flatpickrInstance.selectedDates[0];
          const to = flatpickrInstance.selectedDates[1];
          modalDateRangeSpan.textContent = `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
          bookingModal.style.display = "flex";
      }
  }

  function closeBookingModal() {
      bookingModal.style.display = "none";
      // Reset formuláře v modalu
      bookingForm.reset();
      otherPurposeGroup.style.display = 'none';
  }

  openModalButton.addEventListener('click', openBookingModal);
  closeModalButton.addEventListener('click', closeBookingModal);
  window.addEventListener('click', (event) => {
      if (event.target === bookingModal) {
          closeBookingModal();
      }
  });
  
  purposeSelect.addEventListener('change', () => {
      if (purposeSelect.value === 'Jiný') {
          otherPurposeGroup.style.display = 'block';
      } else {
          otherPurposeGroup.style.display = 'none';
      }
  });


  // --- Inicializace Aplikace ---
  function getToken() {
    return localStorage.getItem("authToken");
  }

  function initializeDatePicker(disabledDates = []) {
    const flatpickrConfig = {
      mode: "range",
      dateFormat: "Y-m-d",
      inline: true,
      disable: disabledDates,
      minDate: "today",
      locale: "cs",
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        currentDate.setHours(0, 0, 0, 0);
        const currentTimestamp = currentDate.getTime();

        if (!window.currentReservations || window.currentReservations.length === 0) return;

        const matchingReservation = window.currentReservations.find((r) => {
          try {
            const resStart = new Date(r.from);
            const resEnd = new Date(r.to);
            resStart.setHours(0, 0, 0, 0);
            resEnd.setHours(0, 0, 0, 0);
            return currentTimestamp >= resStart.getTime() && currentTimestamp <= resEnd.getTime();
          } catch (e) {
            return false;
          }
        });

        if (matchingReservation) {
          dayElem.title = `Rezervováno: ${matchingReservation.username}`;
          dayElem.classList.add("booked-day");
          const userColorClass = `user-${matchingReservation.userId}`;
          if(userColors[matchingReservation.userId]) {
              dayElem.classList.add(userColorClass);
          } else {
              dayElem.classList.add("booked-unknown-user");
          }
        }
      },
      onChange: function (selectedDates, dateStr, instance) {
        const checkInDateDisplay = document.getElementById("check-in-date-display");
        const checkOutDateDisplay = document.getElementById("check-out-date-display");

        if (selectedDates.length >= 1) {
          checkInDateDisplay.textContent = instance.formatDate(selectedDates[0], "d. M Y");
          if (selectedDates.length === 2) {
            checkOutDateDisplay.textContent = instance.formatDate(selectedDates[1], "d. M Y");
            openModalButton.style.display = 'block'; // Zobrazit tlačítko
          } else {
            checkOutDateDisplay.textContent = "- Vyberte -";
            openModalButton.style.display = 'none'; // Skrýt tlačítko
          }
        } else {
          checkInDateDisplay.textContent = "- Vyberte -";
          checkOutDateDisplay.textContent = "- Vyberte -";
          openModalButton.style.display = 'none';
        }
        
        if (selectedDates.length === 2) {
            renderReservationsForSelection(selectedDates);
        } else {
            renderReservationsOverview(instance.currentMonth, instance.currentYear);
        }
      },
    };

    try {
      flatpickrInstance = flatpickr(calendarContainer, flatpickrConfig);
    } catch (e) {
      console.error("KRITICKÁ CHYBA při inicializaci flatpickr():", e);
    }
  }

  async function loadReservations() {
    if (reservationsListDiv) reservationsListDiv.innerHTML = "<p><i>Aktualizuji rezervace...</i></p>";
    
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
        logoutButton.click();
        return;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Chyba ${response.status}` }));
        throw new Error(errorData.message || `Chyba při načítání rezervací: ${response.status}`);
      }

      const rezervace = await response.json();
      window.currentReservations = rezervace;
      
      const disabledRanges = rezervace.map((r) => ({ from: r.from, to: r.to }));

      if (flatpickrInstance) {
        flatpickrInstance.set("disable", disabledRanges);
        renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
      } else {
        initializeDatePicker(disabledRanges);
        setTimeout(() => {
          if (flatpickrInstance) {
            renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
          }
        }, 50);
      }
    } catch (error) {
      console.error("Chyba při načítání/aktualizaci rezervací:", error);
      if (reservationsListDiv) reservationsListDiv.innerHTML = `<p style="color: red;">Nepodařilo se aktualizovat rezervace.</p>`;
    }
  }

  function formatDateForDisplay(date) {
    if(!date) return "";
    if (typeof date === 'string') {
        const parts = date.split("-");
        if (parts.length !== 3) return date;
        const [year, month, day] = parts;
        return `${day}.${month}.${year}`;
    }
    // if it's a Date object
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  }

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    bookingMessage.textContent = "Odesílám rezervaci...";
    bookingMessage.style.color = "";

    const token = getToken();
    if (!token || !flatpickrInstance || flatpickrInstance.selectedDates.length !== 2) {
      bookingMessage.textContent = "Chyba: Vypršelo přihlášení nebo chybí výběr datumu.";
      bookingMessage.style.color = "red";
      return;
    }
    
    let purpose = purposeSelect.value;
    if (purpose === 'Jiný') {
        purpose = otherPurposeInput.value.trim();
        if (!purpose) {
            alert('Prosím, specifikujte jiný účel návštěvy.');
            return;
        }
    }

    const rezervaceData = {
      from: flatpickrInstance.formatDate(flatpickrInstance.selectedDates[0], "Y-m-d"),
      to: flatpickrInstance.formatDate(flatpickrInstance.selectedDates[1], "Y-m-d"),
      purpose: purpose,
      notes: notesTextarea.value.trim(),
    };

    try {
      const response = await fetch(`${backendUrl}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rezervaceData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Chyba ${response.status}`);
      }
      
      closeBookingModal();
      bookingMessage.textContent = `Rezervace úspěšně vytvořena!`;
      bookingMessage.style.color = "green";
      
      flatpickrInstance.clear();
      document.getElementById("check-in-date-display").textContent = "- Vyberte -";
      document.getElementById("check-out-date-display").textContent = "- Vyberte -";
      openModalButton.style.display = 'none';

      loadReservations();
    } catch (error) {
      console.error("Chyba při odeslání rezervace:", error);
      alert(`Chyba: ${error.message}`); // Použijeme alert v modalu
    }
  });

  function renderReservationsOverview(month, year) {
    if (!reservationsListDiv) return;
    if(reservationsContainerTitle) {
        reservationsContainerTitle.textContent = "Přehled rezervací v tomto měsíci";
    }

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const filteredReservations = window.currentReservations.filter((r) => {
      try {
        const resStart = new Date(r.from);
        const resEnd = new Date(r.to);
        return resStart <= monthEnd && resEnd >= monthStart;
      } catch (e) { return false; }
    });

    renderReservationList(filteredReservations, "Pro tento měsíc nejsou žádné rezervace.");
  }
  
  function renderReservationsForSelection(selectedDates) {
    if (!reservationsListDiv || selectedDates.length !== 2) return;
    
    if(reservationsContainerTitle) {
        reservationsContainerTitle.textContent = "Přehled rezervací pro Váš výběr";
    }

    const selectionStart = selectedDates[0];
    const selectionEnd = selectedDates[1];

    const overlappingReservations = window.currentReservations.filter(r => {
        try {
            const resStart = new Date(r.from);
            const resEnd = new Date(r.to);
            return resStart <= selectionEnd && resEnd >= selectionStart;
        } catch(e) { return false; }
    });

    renderReservationList(overlappingReservations, "Ve vybraném termínu nejsou žádné jiné rezervace.");
  }
  
  function renderReservationList(reservations, emptyMessage) {
      reservationsListDiv.innerHTML = "";
      if (reservations.length === 0) {
          reservationsListDiv.innerHTML = `<p><i>${emptyMessage}</i></p>`;
      } else {
          reservations.sort((a, b) => new Date(a.from) - new Date(b.from));
          const list = document.createElement("ul");
          reservations.forEach((r) => {
              const listItem = document.createElement("li");
              let text = `<strong>${r.username}:</strong> ${formatDateForDisplay(r.from)} - ${formatDateForDisplay(r.to)}`;
              if (r.purpose) {
                  text += ` (Účel: ${r.purpose})`;
              }
              listItem.innerHTML = text;
              list.appendChild(listItem);
          });
          reservationsListDiv.appendChild(list);
      }
  }

  // --- Spuštění při načtení stránky ---
  const initialToken = getToken();
  const initialUsername = localStorage.getItem("username");
  if (initialToken && initialUsername) {
    showApp(initialUsername);
  } else {
    showLogin();
  }
});
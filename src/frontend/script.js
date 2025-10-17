document.addEventListener("DOMContentLoaded", () => {
  // Query all DOM elements up front to avoid TDZ and redeclaration issues
  const loginSection = document.getElementById("login-section");
  const appSection = document.getElementById("app-section");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("login-password");
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
  const reservationsTitle = document.getElementById("reservations-title");

  // Prvky pro modální okno rezervace
  const bookingModal = document.getElementById("booking-modal");
  const closeModalButton = document.querySelector(".modal-close-button");
  const openModalButton = document.getElementById("open-booking-modal-button");
  const bookingForm = document.getElementById("booking-form");
  const bookingMessage = document.getElementById("booking-message");
  const modalDateRangeSpan = document.getElementById("modal-date-range");
  const modalTitle = document.getElementById("modal-title");
  const modalSubmitButton = document.getElementById("modal-submit-button");
  const modalDeleteButton = document.getElementById("modal-delete-button");
  const reservationIdInput = document.getElementById("reservation-id");
  const purposeSelect = document.getElementById("purpose-select");
  const otherPurposeGroup = document.getElementById("other-purpose-group");
  const otherPurposeInput = document.getElementById("other-purpose-input");
  const notesTextarea = document.getElementById("notes-textarea");

  // Prvky pro modální okno potvrzení smazání
  const confirmDeleteModal = document.getElementById('confirm-delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // Password toggle elements
  const togglePasswordLogin = document.getElementById('toggle-password-login');
  const registerPasswordInput = document.getElementById('register-password');
  const togglePasswordRegister = document.getElementById('toggle-password-register');

  // Přidání tlačítka pro vymazání výběru datumu (guarded)
  const clearDateButton = document.createElement('button');
  clearDateButton.id = 'clear-date-button';
  clearDateButton.textContent = 'Vymazat výběr datumu';
  clearDateButton.className = 'button-secondary';
  clearDateButton.style.margin = '8px 0';
  // Use a runtime lookup to avoid TDZ / initialization timing issues
  const _calendarContainer = calendarContainer || document.querySelector('.calendar-container');
  if (_calendarContainer && _calendarContainer.parentNode) {
    _calendarContainer.parentNode.insertBefore(clearDateButton, _calendarContainer.nextSibling);
  }

  clearDateButton.addEventListener('click', () => {
    if (typeof flatpickrInstance !== 'undefined' && flatpickrInstance) {
      flatpickrInstance.clear();
      const inEl = document.getElementById("check-in-date-display");
      const outEl = document.getElementById("check-out-date-display");
      if (inEl) inEl.textContent = "- Vyberte -";
      if (outEl) outEl.textContent = "- Vyberte -";
      if (openModalButton) openModalButton.style.display = 'none';
    }
  });
  const userColors = {
    user1: "#FFD700",
    user2: "#FFA500",
  };



  // Globální proměnné
  let flatpickrInstance = null;
  window.currentReservations = [];
  let reservationIdToDelete = null; // Pro uchování ID rezervace ke smazání
  const backendUrl = "";

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
    appSection.style.display = "flex"; // Změna na flex pro správné zobrazení
    loggedInUsernameSpan.textContent = username;
    loadReservations();
    // Zobrazit admin odkaz pokud je uživatel admin
    const adminLink = document.getElementById('admin-link');
    const role = localStorage.getItem('role');
    if (adminLink) {
      if (role === 'admin') {
        adminLink.style.display = 'inline-block';
      } else {
        adminLink.style.display = 'none';
      }
    }
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
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!usernameInput || !passwordInput) return;
      loginError.textContent = "";
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) {
        if (loginError) loginError.textContent = "Prosím, vyplňte jméno i heslo.";
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `Chyba ${response.status}`);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("username", data.username || username);
        if (data.userId) localStorage.setItem("userId", data.userId);
        if (data.role) localStorage.setItem("role", data.role);
        showApp(data.username || username);
      } catch (err) {
        console.error("Chyba při přihlášení:", err);
        if (loginError) loginError.textContent = err.message || "Nepodařilo se přihlásit.";
        if (passwordInput) passwordInput.value = "";
      }
    });
  }

  // --- Logika Registrace ---
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerMessage.textContent = "";
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    // Validace uživatelského jména
    if (username.length < 3 || username.length > 20) {
      registerMessage.textContent = "Uživatelské jméno musí mít 3-20 znaků.";
      registerMessage.style.color = "red";
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      registerMessage.textContent = "Jméno může obsahovat pouze písmena, čísla, podtržítko, tečku a pomlčku.";
      registerMessage.style.color = "red";
      return;
    }
    if (/^[._-]/.test(username) || /[._-]$/.test(username)) {
      registerMessage.textContent = "Jméno nesmí začínat ani končit speciálním znakem.";
      registerMessage.style.color = "red";
      return;
    }
    if (/([._-])\1+/.test(username)) {
      registerMessage.textContent = "Jméno nesmí obsahovat více speciálních znaků za sebou.";
      registerMessage.style.color = "red";
      return;
    }
    if (username.includes(' ')) {
      registerMessage.textContent = "Jméno nesmí obsahovat mezery.";
      registerMessage.style.color = "red";
      return;
    }
    if (password.length < 6) {
      registerMessage.textContent = "Heslo musí mít alespoň 6 znaků.";
      registerMessage.style.color = "red";
      return;
    }
    // Povolené speciální znaky
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g;
    const matches = password.match(specialChars);
    if (matches && matches.length > 1) {
      registerMessage.textContent = "Heslo nesmí obsahovat více než jeden speciální symbol.";
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
      
  setTimeout(() => { showLogin(); loadReservations(); }, 2000); // Refresh po registraci
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
  localStorage.removeItem("userId"); // Odstraníme i ID
  localStorage.removeItem("role"); // Odstraníme i roli
    if (flatpickrInstance) {
      flatpickrInstance.destroy();
      flatpickrInstance = null;
    }
    window.currentReservations = [];
    showLogin();
  });
  
  // --- MODÁLNÍ OKNO LOGIKA ---
  function openBookingModal(isEdit = false, reservation = null) {
      bookingForm.reset();
      otherPurposeGroup.style.display = 'none';
      reservationIdInput.value = '';
      modalDeleteButton.style.display = 'none';
      modalDeleteButton.onclick = null;

      if (isEdit && reservation) {
        // Editace existující rezervace
        modalTitle.textContent = "Upravit rezervaci";
        modalSubmitButton.textContent = "Uložit změny";
        modalDeleteButton.style.display = 'inline-block';
        modalDeleteButton.onclick = () => {
            closeBookingModal();
            openConfirmDeleteModal(reservation.id);
        };
        modalDateRangeSpan.textContent = `${formatDateForDisplay(reservation.from)} - ${formatDateForDisplay(reservation.to)}`;
        // Přidání inputů pro úpravu datumu od/do
        modalDateRangeSpan.innerHTML = `
          <label>Od: <input type="date" id="edit-from-date" value="${reservation.from}" /></label>
          <label>Do: <input type="date" id="edit-to-date" value="${reservation.to}" /></label>
        `;
        reservationIdInput.value = reservation.id;
        
        // Nastavení hodnot formuláře
        const isOtherPurpose = !['Relax', 'Práce na zahradě', 'Údržba chaty'].includes(reservation.purpose);
        if (isOtherPurpose) {
            purposeSelect.value = 'Jiný';
            otherPurposeGroup.style.display = 'block';
            otherPurposeInput.value = reservation.purpose || '';
        } else {
            purposeSelect.value = reservation.purpose || 'Relax';
        }
        notesTextarea.value = reservation.notes || '';
        
      } else {
        // Vytvoření nové rezervace
        modalTitle.textContent = "Detail rezervace";
        modalSubmitButton.textContent = "Potvrdit rezervaci";
        if (flatpickrInstance && flatpickrInstance.selectedDates.length === 2) {
            const from = flatpickrInstance.selectedDates[0];
            const to = flatpickrInstance.selectedDates[1];
            modalDateRangeSpan.textContent = `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;
        }
      }
      bookingModal.style.display = "flex";
  }

  function closeBookingModal() {
  bookingModal.style.display = "none";
  bookingMessage.textContent = "";
  }
  
  function openConfirmDeleteModal(id) {
    reservationIdToDelete = id;
    confirmDeleteModal.style.display = 'flex';
  }

  function closeConfirmDeleteModal() {
    confirmDeleteModal.style.display = 'none';
    reservationIdToDelete = null;
  }

  openModalButton.addEventListener('click', () => openBookingModal(false));
  closeModalButton.addEventListener('click', closeBookingModal);
  
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
          const userClass = `user-${matchingReservation.userId.replace(/\s+/g, '-')}`;
          // expose reservation data on the day element for strip rendering
          try {
            dayElem.dataset.reservationId = matchingReservation.id;
            dayElem.dataset.username = matchingReservation.username || '';
            dayElem.dataset.userId = matchingReservation.userId || '';
            dayElem.dataset.dateIso = date.toISOString().slice(0,10);
          } catch (e) {
            // silent
          }
          dayElem.classList.add(userClass);
          
          if(!userColors[matchingReservation.userId]) {
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
            openModalButton.style.display = 'block';
          } else {
            checkOutDateDisplay.textContent = "- Vyberte -";
            openModalButton.style.display = 'none';
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
      onMonthChange: function(selectedDates, dateStr, instance) {
        renderReservationsOverview(instance.currentMonth, instance.currentYear);
      },
    };

    try {
      const _cal = calendarContainer || document.querySelector('.calendar-container');
      if (!_cal) throw new Error('Element .calendar-container nenalezen, nelze inicializovat kalendář.');
      flatpickrInstance = flatpickr(_cal, flatpickrConfig);
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
        flatpickrInstance.redraw();
          renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
          setTimeout(() => renderReservationStrips(), 30);
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
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  // Odstraněno posouvání o timezone
  return `${dateObj.getDate()}.${dateObj.getMonth() + 1}.${dateObj.getFullYear()}`;
  }

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    bookingMessage.textContent = "Odesílám rezervaci...";
    bookingMessage.style.color = "";

  let purpose = purposeSelect.value;
    if (purpose === 'Jiný') {
        purpose = otherPurposeInput.value.trim();
        if (!purpose) {
            bookingMessage.textContent = 'Prosím, specifikujte jiný účel návštěvy.';
            bookingMessage.style.color = 'red';
            return;
        }
    }
    // Validace účelu návštěvy
    if (!purpose || purpose.length > 50 || /[<>]/.test(purpose)) {
      bookingMessage.textContent = "Účel návštěvy musí být vyplněn, max. 50 znaků, nesmí obsahovat < nebo >.";
      bookingMessage.style.color = "red";
      return;
    }
    // Validace poznámky
    const notes = notesTextarea.value.trim();
    if (notes.length > 200) {
      bookingMessage.textContent = "Poznámka nesmí být delší než 200 znaků.";
      bookingMessage.style.color = "red";
      return;
    }
    if (/[<>]/.test(notes) || /script/i.test(notes)) {
      bookingMessage.textContent = "Poznámka nesmí obsahovat <, > ani slovo 'script'.";
      bookingMessage.style.color = "red";
      return;
    }
    event.preventDefault();
    bookingMessage.textContent = "Odesílám rezervaci...";
    bookingMessage.style.color = "";

    // Uložíme aktuální měsíc a rok z flatpickrInstance
    let prevMonth = null;
    let prevYear = null;
    if (flatpickrInstance) {
      prevMonth = flatpickrInstance.currentMonth;
      prevYear = flatpickrInstance.currentYear;
    }

    const token = getToken();
    if (!token) {
      bookingMessage.textContent = "Chyba: Vypršelo přihlášení.";
      bookingMessage.style.color = "red";
      return;
    }
    
    if (purpose === 'Jiný') {
        purpose = otherPurposeInput.value.trim();
        if (!purpose) {
            alert('Prosím, specifikujte jiný účel návštěvy.');
            return;
        }
    }
    
    const isEditMode = !!reservationIdInput.value;
    const url = isEditMode 
        ? `${backendUrl}/api/reservations/${reservationIdInput.value}`
        : `${backendUrl}/api/reservations`;
        
    const method = isEditMode ? "PUT" : "POST";

    let bodyData = {
        purpose: purpose,
        notes: notesTextarea.value.trim(),
    };

    if (isEditMode) {
      // Pokud editujeme, vezmeme hodnoty z inputů
      const fromInput = document.getElementById('edit-from-date');
      const toInput = document.getElementById('edit-to-date');
      if (!fromInput || !toInput || !fromInput.value || !toInput.value) {
        bookingMessage.textContent = "Chyba: Chybí datum od/do.";
        bookingMessage.style.color = "red";
        return;
      }
      const fromDate = new Date(fromInput.value);
      const toDate = new Date(toInput.value);
      if (toDate < fromDate) {
        bookingMessage.textContent = "Chyba: Datum 'do' nesmí být před datem 'od'.";
        bookingMessage.style.color = "red";
        return;
      }
      // Validace kolize s jinou rezervací
      const myId = reservationIdInput.value;
      const overlap = window.currentReservations.some(r => {
        if (r.id === myId) return false;
        const resStart = new Date(r.from);
        const resEnd = new Date(r.to);
        return fromDate <= resEnd && toDate >= resStart;
      });
      if (overlap) {
        bookingMessage.textContent = "Chyba: Vybraný termín zasahuje do jiné rezervace.";
        bookingMessage.style.color = "red";
        return;
      }
      bodyData.from = fromInput.value;
      bodyData.to = toInput.value;
    } else {
      if (!flatpickrInstance || flatpickrInstance.selectedDates.length !== 2) {
        bookingMessage.textContent = "Chyba: Chybí výběr datumu.";
        bookingMessage.style.color = "red";
        return;
      }
      bodyData.from = flatpickrInstance.formatDate(flatpickrInstance.selectedDates[0], "Y-m-d");
      bodyData.to = flatpickrInstance.formatDate(flatpickrInstance.selectedDates[1], "Y-m-d");
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || `Chyba ${response.status}`);
      }
    
      closeBookingModal();
    
      if (!isEditMode) {
        flatpickrInstance.clear();
        document.getElementById("check-in-date-display").textContent = "- Vyberte -";
        document.getElementById("check-out-date-display").textContent = "- Vyberte -";
        openModalButton.style.display = 'none';
      }

      // Po odeslání rezervace načteme rezervace a obnovíme měsíc
      await loadReservations();
      // Pokud jsme měli uložený měsíc/rok, nastavíme zpět
      if (flatpickrInstance && prevMonth !== null && prevYear !== null) {
        flatpickrInstance.changeMonth(prevMonth, false);
        flatpickrInstance.currentYear = prevYear;
        renderReservationsOverview(prevMonth, prevYear);
      }
    } catch (error) {
      console.error("Chyba při odeslání rezervace:", error);
      alert(`Chyba: ${error.message}`);
    }
  });
  
  const monthNames = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];

  function renderReservationsOverview(month, year) {
    if (!reservationsListDiv || !reservationsTitle) return;
    
    reservationsTitle.textContent = `Přehled v ${monthNames[month]} ${year}`;

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
  // draw strips under calendar for visible reservations
  setTimeout(() => renderReservationStrips(), 20);
  }
  
  function renderReservationsForSelection(selectedDates) {
    if (!reservationsListDiv || !reservationsTitle || selectedDates.length !== 2) return;
    
    reservationsTitle.textContent = "Konflikty pro Váš výběr";

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
    setTimeout(() => renderReservationStrips(), 20);

  function renderReservationStrips() {
    if (!calendarContainer) return;
    // remove existing strips
    const existing = calendarContainer.querySelectorAll('.reservation-strip');
    existing.forEach(n => n.remove());

    // collect day elements with reservation ids
    const dayElems = Array.from(calendarContainer.querySelectorAll('.flatpickr-day[data-reservation-id]'));
    if (dayElems.length === 0) return;

    const groups = {};
    dayElems.forEach(de => {
      const id = de.dataset.reservationId;
      if (!id) return;
      groups[id] = groups[id] || [];
      groups[id].push(de);
    });

    const containerRect = calendarContainer.getBoundingClientRect();
    Object.keys(groups).forEach(id => {
      const days = groups[id].slice().sort((a,b) => (a.dataset.dateIso > b.dataset.dateIso) ? 1 : -1);
      const first = days[0];
      const last = days[days.length - 1];
      if (!first || !last) return;

      const r1 = first.getBoundingClientRect();
      const r2 = last.getBoundingClientRect();
      // position relative to calendarContainer
      const left = r1.left - containerRect.left;
      const width = r2.right - r1.left;
      // place strip slightly below the day cells
      const top = r1.bottom - containerRect.top + 6;

      const strip = document.createElement('div');
      strip.className = 'reservation-strip';
      strip.style.left = `${left}px`;
      strip.style.width = `${Math.max(12, width)}px`;
      strip.style.top = `${top}px`;
      strip.dataset.reservationId = id;

      const label = document.createElement('span');
      label.className = 'reservation-strip-label';
      label.textContent = days[0].dataset.username || 'Rezervace';
      strip.appendChild(label);

      // use user color if available
      const userId = days[0].dataset.userId;
      if (userId && userColors[userId]) {
        strip.style.background = userColors[userId];
        strip.style.opacity = '0.25';
      } else {
        strip.style.background = '#e9ecef';
        strip.style.opacity = '0.6';
      }

      calendarContainer.appendChild(strip);
    });
  }
  }
  
  function renderReservationList(reservations, emptyMessage) {
      reservationsListDiv.innerHTML = "";
      if (reservations.length === 0) {
          reservationsListDiv.innerHTML = `<p><i>${emptyMessage}</i></p>`;
      } else {
          reservations.sort((a, b) => new Date(a.from) - new Date(b.from));
          const list = document.createElement("ul");
          const loggedInUserId = localStorage.getItem("userId");

          reservations.forEach((r) => {
              const listItem = document.createElement("li");
              const notesHTML = r.notes 
                  ? `<p><strong>Poznámka:</strong> ${r.notes}</p>` 
                  : '';
              
              let actionButtonsHTML = '';
              if (loggedInUserId === r.userId) {
                  actionButtonsHTML = `
                  <div class="action-buttons">
                      <button class="edit-btn" data-id="${r.id}" title="Upravit rezervaci"><i class="fas fa-pencil-alt"></i></button>
                      <button class="delete-btn" data-id="${r.id}" title="Smazat rezervaci"><i class="fas fa-trash-alt"></i></button>
                  </div>`;
              }

              listItem.innerHTML = `
                ${actionButtonsHTML}
                <div class="reservation-header">
                    <strong>${r.username}</strong>
                    <span style="color:#d18b00;font-size:0.95em;margin-left:8px;">
                      ${formatDateForDisplay(r.from)} – ${formatDateForDisplay(r.to)}
                    </span>
                </div>
                <div class="reservation-body">
                    <p><strong>Účel:</strong> ${r.purpose || '<em>Nespecifikováno</em>'}</p>
                    ${notesHTML}
                </div>
              `;
              list.appendChild(listItem);
          });
          reservationsListDiv.appendChild(list);
      }
  }

  // Delegované event listenery pro akce v seznamu rezervací
  reservationsListDiv.addEventListener('click', (event) => {
    const editButton = event.target.closest('.edit-btn');
    if (editButton) {
        const reservationId = editButton.dataset.id;
        const reservation = window.currentReservations.find(r => r.id === reservationId);
        if (reservation) {
            openBookingModal(true, reservation);
        }
        return;
    }

    const deleteButton = event.target.closest('.delete-btn');
    if (deleteButton) {
        const reservationId = deleteButton.dataset.id;
        openConfirmDeleteModal(reservationId);
    }
  });

  // Listenery pro potvrzovací modál
  cancelDeleteBtn.addEventListener('click', closeConfirmDeleteModal);
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!reservationIdToDelete) return;

    console.log(`[DELETE] Pokus o smazání rezervace s ID: ${reservationIdToDelete}`);

    const token = getToken();
    if (!token) {
        alert("Vaše přihlášení vypršelo. Přihlaste se prosím znovu.");
        closeConfirmDeleteModal();
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/reservations/${reservationIdToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('[DELETE] Odpověď ze serveru:', response.status, response.statusText);
        const result = await response.json();
        console.log('[DELETE] Data odpovědi:', result);

        if (!response.ok) throw new Error(result.message || `Chyba ${response.status}`);
        
        closeConfirmDeleteModal();
        
        console.log('[DELETE] Úspěšně smazáno na serveru. Aktualizuji frontend.');
        
        // Místo znovunačtení všeho (což způsobovalo problém),
        // smažeme rezervaci z lokálního pole a překreslíme komponenty.
        const index = window.currentReservations.findIndex(r => r.id === reservationIdToDelete);
        if (index > -1) {
            window.currentReservations.splice(index, 1);
            console.log('[DELETE] Rezervace odstraněna z lokálního pole. Překresluji UI.');
        } else {
            console.warn('[DELETE] Rezervace k smazání nebyla nalezena v lokálním poli.');
        }
        
        // Aktualizujeme kalendář a seznam
        const disabledRanges = window.currentReservations.map((r) => ({ from: r.from, to: r.to }));
        flatpickrInstance.set('disable', disabledRanges);
        flatpickrInstance.redraw();
        renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
      loadReservations(); // Po úspěšném smazání rezervace načteme nové rezervace (refresh UI)

    } catch (error) {
        console.error("Chyba při mazání rezervace:", error);
        alert(`Nepodařilo se smazat rezervaci: ${error.message}`);
        closeConfirmDeleteModal();

        loadReservations(); // Obnovení dat pro případ nekonzistence
    }
  });

  // Zavírání modálních oken kliknutím na pozadí
  window.addEventListener('click', (event) => {
      if (event.target === bookingModal) {
          closeBookingModal();
      }
      if (event.target === confirmDeleteModal) {
          closeConfirmDeleteModal();
      }
  });


  // --- Spuštění při načtení stránky ---
  const initialToken = getToken();
  const initialUsername = localStorage.getItem("username");
  if (initialToken && initialUsername) {
    showApp(initialUsername);
  } else {
    showLogin();
  }
});

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

  // Elements for the booking modal
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
  const backupWarningMessage = document.getElementById("backup-warning-message");

  // Elements for the confirm delete modal
  const confirmDeleteModal = document.getElementById('confirm-delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  // Password toggle elements
  const togglePasswordLogin = document.getElementById('toggle-password-login');
  const registerPasswordInput = document.getElementById('register-password');
  const togglePasswordRegister = document.getElementById('toggle-password-register');

  // Add a button to clear the date selection (guarded)
  const clearDateButton = document.createElement('button');
  clearDateButton.id = 'clear-date-button';
  clearDateButton.textContent = 'Vymazat výběr datumu';
  clearDateButton.className = 'button-secondary';
  clearDateButton.style.margin = '8px 0';
  clearDateButton.style.display = 'none'; // Initially hide the button
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
      clearDateButton.style.display = 'none'; // Hide button on clear
    }
  });
  
  // --- Helper functions for colors ---

  /**
   * Converts a HEX color to an RGBA color.
   * @param {string} hex The hex color code (e.g., "#FF5733").
   * @param {number} alpha The opacity value from 0 to 1.
   * @returns {string|null} The RGBA color string or null if hex is invalid.
   */
  function hexToRgba(hex, alpha = 1) {
    if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return null;
    let c = hex.substring(1).split('');
    if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
  }

  // Global variables
  let flatpickrInstance = null;
  window.currentReservations = [];
  let reservationIdToDelete = null; 
  const backendUrl = "";

  // --- Functions for showing/hiding sections ---
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
    
    const adminLink = document.getElementById('admin-link');
    const role = localStorage.getItem('role');
    if (adminLink) {
      adminLink.style.display = (role === 'admin') ? 'inline-block' : 'none';
    }
  }

  // --- Form Switching Logic ---
  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    showRegister();
  });

  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showLogin();
  });

  // --- Login Logic ---
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
        console.error("Login error:", err);
        if (loginError) loginError.textContent = err.message || "Nepodařilo se přihlásit.";
        if (passwordInput) passwordInput.value = "";
      }
    });
  }

  // --- Registration Logic ---
  if(registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        registerMessage.textContent = "";
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;
        const color = document.getElementById("register-color").value;

        if (username.length < 3 || username.length > 20) {
            registerMessage.textContent = "Uživatelské jméno musí mít 3-20 znaků.";
            registerMessage.style.color = "red";
            return;
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(username) || /^[._-]/.test(username) || /[._-]$/.test(username) || /([._-])\1+/.test(username) || username.includes(' ')) {
            registerMessage.textContent = "Jméno obsahuje neplatné znaky nebo formátování.";
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
                body: JSON.stringify({ username, password, color }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `Chyba ${response.status}`);
            
            registerMessage.textContent = data.message;
            registerMessage.style.color = "green";
            registerForm.reset();
            
            setTimeout(() => { showLogin(); }, 2000);
        } catch (error) {
            console.error("Registration error:", error);
            registerMessage.textContent = error.message || "Nepodařilo se zaregistrovat.";
            registerMessage.style.color = "red";
        }
    });
  }

  // --- Logout Logic ---
  if(logoutButton) {
    logoutButton.addEventListener("click", () => {
        localStorage.clear();
        if (flatpickrInstance) {
            flatpickrInstance.destroy();
            flatpickrInstance = null;
        }
        window.currentReservations = [];
        showLogin();
    });
  }
  
  // --- MODAL WINDOW LOGIC ---
  function openBookingModal(isEdit = false, reservation = null) {
      bookingForm.reset();
      otherPurposeGroup.style.display = 'none';
      reservationIdInput.value = '';
      modalDeleteButton.style.display = 'none';
      modalDeleteButton.onclick = null;
      backupWarningMessage.style.display = 'none'; // Skrýt varování ve výchozím stavu

      if (isEdit && reservation) {
        modalTitle.textContent = "Upravit rezervaci";
        modalSubmitButton.textContent = "Uložit změny";
        modalDeleteButton.style.display = 'inline-block';
        modalDeleteButton.onclick = () => {
            closeBookingModal();
            openConfirmDeleteModal(reservation.id);
        };
        modalDateRangeSpan.innerHTML = `
          <label>Od: <input type="date" id="edit-from-date" value="${reservation.from}" /></label>
          <label>Do: <input type="date" id="edit-to-date" value="${reservation.to}" /></label>
        `;
        reservationIdInput.value = reservation.id;
        
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
        modalTitle.textContent = "Detail rezervace";
        modalSubmitButton.textContent = "Potvrdit rezervaci";
        if (flatpickrInstance && flatpickrInstance.selectedDates.length === 2) {
            const from = flatpickrInstance.selectedDates[0];
            const to = flatpickrInstance.selectedDates[1];
            modalDateRangeSpan.textContent = `${formatDateForDisplay(from)} - ${formatDateForDisplay(to)}`;

            // Zkontrolovat překryv a zobrazit varování, pokud je to nutné
            const isOverlapping = window.currentReservations.some(r => {
                // Kontrolujeme pouze proti hlavním rezervacím
                if (r.status === 'backup') return false;
                const resStart = new Date(r.from);
                const resEnd = new Date(r.to);
                return from <= resEnd && to >= resStart;
            });

            if (isOverlapping) {
                backupWarningMessage.style.display = 'block';
            }
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

  if(openModalButton) openModalButton.addEventListener('click', () => openBookingModal(false));
  if(closeModalButton) closeModalButton.addEventListener('click', closeBookingModal);
  
  if(purposeSelect) {
    purposeSelect.addEventListener('change', () => {
        otherPurposeGroup.style.display = (purposeSelect.value === 'Jiný') ? 'block' : 'none';
    });
  }


  // --- Application Initialization ---
  function getToken() {
    return localStorage.getItem("authToken");
  }

  function initializeDatePicker(disabledDates = []) {
    const flatpickrConfig = {
      mode: "range",
      dateFormat: "Y-m-d",
      inline: true,
      minDate: "today",
      locale: "cs",
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        const currentTimestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

        if (!window.currentReservations || window.currentReservations.length === 0) return;

        const reservationsForDay = window.currentReservations.filter((r) => {
          try {
            const startTs = new Date(r.from + 'T00:00:00Z').getTime();
            const endTs = new Date(r.to + 'T00:00:00Z').getTime();
            return currentTimestamp >= startTs && currentTimestamp <= endTs;
          } catch (e) {
            return false;
          }
        });

        const primaryReservation = reservationsForDay.find(r => r.status !== 'backup');
        const backupReservation = reservationsForDay.find(r => r.status === 'backup');

        if (primaryReservation && backupReservation) {
            const primaryColor = primaryReservation.userColor || '#808080';
            const backupColor = backupReservation.userColor || '#cccccc';
            
            dayElem.style.backgroundImage = `linear-gradient(to right, ${hexToRgba(primaryColor, 0.8)} 50%, ${hexToRgba(backupColor, 0.8)} 50%)`;
            dayElem.classList.add("booked-day");
            dayElem.title = `Hlavní: ${primaryReservation.username}\nZáložní: ${backupReservation.username}`;

        } else if (primaryReservation) {
            dayElem.title = `Rezervováno: ${primaryReservation.username}`;
            dayElem.classList.add("booked-day");
            
            const assignedColor = primaryReservation.userColor;
            if (assignedColor) {
              dayElem.style.backgroundColor = hexToRgba(assignedColor, 0.8);
              dayElem.style.color = '#fff';
              dayElem.style.fontWeight = 'bold';
            }
        }
      },
      onChange: function (selectedDates, dateStr, instance) {
        const checkInDateDisplay = document.getElementById("check-in-date-display");
        const checkOutDateDisplay = document.getElementById("check-out-date-display");
        const clearBtn = document.getElementById('clear-date-button');

        if (selectedDates.length >= 1) {
          checkInDateDisplay.textContent = instance.formatDate(selectedDates[0], "d. M Y");
          if(clearBtn) clearBtn.style.display = 'block';
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
          if(clearBtn) clearBtn.style.display = 'none';
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
      onReady: function(selectedDates, dateStr, instance) {
        renderReservationsOverview(instance.currentMonth, instance.currentYear);
      }
    };

    try {
      if (!_calendarContainer) throw new Error('Calendar container not found.');
      flatpickrInstance = flatpickr(_calendarContainer, flatpickrConfig);
    } catch (e) {
      console.error("Critical error initializing flatpickr:", e);
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
        throw new Error(errorData.message);
      }

      const reservations = await response.json();
      window.currentReservations = reservations;
      
      if (flatpickrInstance) {
        flatpickrInstance.redraw();
      } else {
        initializeDatePicker();
      }
      
      setTimeout(() => {
        if (flatpickrInstance) {
            renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
        }
      }, 50);

    } catch (error) {
      console.error("Error loading/refreshing reservations:", error);
      if (reservationsListDiv) reservationsListDiv.innerHTML = `<p style="color: red;">Nepodařilo se aktualizovat rezervace.</p>`;
    }
  }

  function formatDateForDisplay(date) {
    if(!date) return "";
    const dateObj = (typeof date === 'string') ? new Date(date) : date;
    const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
    const correctedDate = new Date(dateObj.getTime() + userTimezoneOffset);
    return `${correctedDate.getDate()}.${correctedDate.getMonth() + 1}.${correctedDate.getFullYear()}`;
  }

  if(bookingForm) {
    bookingForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        bookingMessage.textContent = "Odesílám rezervaci...";
        bookingMessage.style.color = "";

        let purpose = purposeSelect.value;
        if (purpose === 'Jiný') {
            purpose = otherPurposeInput.value.trim();
        }

        if (!purpose || purpose.length > 50 || /[<>]/.test(purpose)) {
            bookingMessage.textContent = "Účel návštěvy: max. 50 znaků, bez < >.";
            bookingMessage.style.color = "red";
            return;
        }

        const notes = notesTextarea.value.trim();
        if (notes.length > 200 || /[<>]/.test(notes) || /script/i.test(notes)) {
            bookingMessage.textContent = "Poznámka: max. 200 znaků, bez < > nebo 'script'.";
            bookingMessage.style.color = "red";
            return;
        }

        const token = getToken();
        if (!token) {
            bookingMessage.textContent = "Chyba: Vypršelo přihlášení.";
            bookingMessage.style.color = "red";
            return;
        }
        
        const isEditMode = !!reservationIdInput.value;
        const url = isEditMode 
            ? `${backendUrl}/api/reservations/${reservationIdInput.value}`
            : `${backendUrl}/api/reservations`;
        const method = isEditMode ? "PUT" : "POST";

        let bodyData = { purpose, notes };

        // Store current view before action
        const monthToReturnTo = flatpickrInstance.currentMonth;
        const yearToReturnTo = flatpickrInstance.currentYear;

        if (isEditMode) {
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

            const myId = reservationIdInput.value;
            const overlap = window.currentReservations.some(r => {
                if (r.id === myId) return false;
                const resStart = new Date(r.from);
                const resEnd = new Date(r.to);
                return fromDate <= resEnd && toDate >= resStart;
            });
            if (overlap) {
                bookingMessage.textContent = "Chyba: Termín zasahuje do jiné rezervace.";
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
            if (!response.ok) throw new Error(result.message || `Chyba ${response.status}`);
        
            closeBookingModal();
        
            if (!isEditMode) {
                flatpickrInstance.clear();
                document.getElementById("check-in-date-display").textContent = "- Vyberte -";
                document.getElementById("check-out-date-display").textContent = "- Vyberte -";
                openModalButton.style.display = 'none';
            }
            await loadReservations();
            
            // After reservations are loaded, jump to the stored month
            if (flatpickrInstance) {
                flatpickrInstance.jumpToDate(new Date(yearToReturnTo, monthToReturnTo));
            }

        } catch (error) {
            console.error("Error submitting reservation:", error);
            alert(`Chyba: ${error.message}`);
        }
    });
  }
  
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
                  ? `<p><strong>Poznámka:</strong> ${r.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` 
                  : '';
              
              let actionButtonsHTML = '';
              if (loggedInUserId === r.userId) {
                  actionButtonsHTML = `
                  <div class="action-buttons">
                      <button class="edit-btn" data-id="${r.id}" title="Upravit rezervaci"><i class="fas fa-pencil-alt"></i></button>
                      <button class="delete-btn" data-id="${r.id}" title="Smazat rezervaci"><i class="fas fa-trash-alt"></i></button>
                  </div>`;
              }

              let statusBadge = '';
              if (r.status === 'backup') {
                  statusBadge = '<span class="status-badge backup">Záložní</span>';
              } else { // Primary or old data without status
                  const hasBackups = reservations.some(backup => backup.parentId === r.id);
                  if (hasBackups) {
                      statusBadge = '<span class="status-badge primary-with-backup">Má zálohy</span>';
                  }
              }

              listItem.innerHTML = `
                ${actionButtonsHTML}
                <div class="reservation-header">
                    <strong>${r.username}</strong>
                    ${statusBadge}
                    <span style="color:#d18b00;font-size:0.95em;margin-left:auto;">
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

  // Delegated event listeners for actions in the reservations list
  reservationsListDiv.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const reservationId = button.dataset.id;
    if (button.classList.contains('edit-btn')) {
        const reservation = window.currentReservations.find(r => r.id === reservationId);
        if (reservation) openBookingModal(true, reservation);
    } else if (button.classList.contains('delete-btn')) {
        openConfirmDeleteModal(reservationId);
    }
  });

  // Listeners for confirmation modal
  if(cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeConfirmDeleteModal);
  if(confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!reservationIdToDelete) return;

        const token = getToken();
        if (!token) {
            alert("Vaše přihlášení vypršelo. Přihlaste se prosím znovu.");
            closeConfirmDeleteModal();
            return;
        }

        try {
            // ZMĚNA: Použití metody POST a odeslání ID v těle požadavku
            const response = await fetch(`${backendUrl}/api/reservations/delete`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ id: reservationIdToDelete })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `Chyba ${response.status}`);
            
            closeConfirmDeleteModal();
            await loadReservations();

        } catch (error) {
            console.error("Error deleting reservation:", error);
            alert(`Nepodařilo se smazat rezervaci: ${error.message}`);
            closeConfirmDeleteModal();
        }
    });
  }

  // Close modals by clicking on the background
  window.addEventListener('click', (event) => {
      if (event.target === bookingModal) closeBookingModal();
      if (event.target === confirmDeleteModal) closeConfirmDeleteModal();
  });


  // --- Run on page load ---
  const initialToken = getToken();
  const initialUsername = localStorage.getItem("username");
  if (initialToken && initialUsername) {
    showApp(initialUsername);
  } else {
    showLogin();
  }
});


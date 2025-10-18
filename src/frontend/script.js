document.addEventListener("DOMContentLoaded", () => {
  // Query all DOM elements up front
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

  // Oprava: Admin Tool link - pouze přesměrování, neodhlašovat
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'admin.html';
    });
  }

  const bookingModal = document.getElementById("booking-modal");
  const openModalButton = document.getElementById("open-booking-modal-button");
  const clearSelectionButton = document.getElementById('clear-selection-button');
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

  const confirmDeleteModal = document.getElementById('confirm-delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  
  const shoppingListDiv = document.getElementById("shopping-list");
  const addItemForm = document.getElementById("add-item-form");
  const itemNameInput = document.getElementById("item-name-input");
  const itemIconInput = document.getElementById("item-icon-input");
  const openIconModalBtn = document.getElementById("open-icon-modal-btn");

  const iconSelectModal = document.getElementById("icon-select-modal");
  const iconGrid = document.getElementById("icon-grid");

  const priceSplitModal = document.getElementById('price-split-modal');
  const priceSplitForm = document.getElementById('price-split-form');
  const userSplitList = document.getElementById('user-split-list');
  const splitModalInfo = document.getElementById('split-modal-info');
  
  const notesListDiv = document.getElementById('notes-list');
  const addNoteForm = document.getElementById('add-note-form');
  const noteMessageInput = document.getElementById('note-message-input');


  document.querySelectorAll('.modal-close-button').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.modal-overlay').style.display = 'none';
    });
  });

  const togglePasswordLogin = document.getElementById('toggle-password-login');
  const registerPasswordInput = document.getElementById('register-password');
  const togglePasswordRegister = document.getElementById('toggle-password-register');

  const _calendarContainer = calendarContainer || document.querySelector('.calendar-container');

  // Helper for password toggle
  const setupPasswordToggle = (toggleBtn, passwordField) => {
    if (!toggleBtn || !passwordField) return;
    toggleBtn.addEventListener('click', () => {
      const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordField.setAttribute('type', type);
      toggleBtn.classList.toggle('fa-eye');
      toggleBtn.classList.toggle('fa-eye-slash');
    });
  };

  setupPasswordToggle(togglePasswordLogin, passwordInput);
  setupPasswordToggle(togglePasswordRegister, registerPasswordInput);
  
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
  let allUsers = [];
  let reservationIdToDelete = null; 
  const backendUrl = "";

  function showLogin() {
    loginSection.style.display = "block";
    registerSection.style.display = "none";
    appSection.style.display = "none";
    if(loginError) loginError.textContent = "";
  }

  function showRegister() {
    loginSection.style.display = "none";
    registerSection.style.display = "block";
    appSection.style.display = "none";
    if(registerMessage) registerMessage.textContent = "";
  }

  async function showApp(username) {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    appSection.style.display = "flex";
    loggedInUsernameSpan.textContent = username;
    
    await fetchUsers(); // Načteme uživatele pro split funkci
    loadReservations();
    loadShoppingList();
    loadNotes();
    
    const adminLink = document.getElementById('admin-link');
    const role = localStorage.getItem('role');
    if (adminLink) {
      adminLink.style.display = (role === 'admin') ? 'inline-block' : 'none';
    }
  }

  if(showRegisterLink) showRegisterLink.addEventListener("click", (e) => { e.preventDefault(); showRegister(); });
  if(showLoginLink) showLoginLink.addEventListener("click", (e) => { e.preventDefault(); showLogin(); });

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
        if (data.color) localStorage.setItem("userColor", data.color);
        showApp(data.username || username);
      } catch (err) {
        console.error("Login error:", err);
        if (loginError) loginError.textContent = err.message || "Nepodařilo se přihlásit.";
        if (passwordInput) passwordInput.value = "";
      }
    });
  }

  if(registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        registerMessage.textContent = "";
        const username = document.getElementById("register-username").value;
        const password = document.getElementById("register-password").value;
        const color = document.getElementById("register-color").value;

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
  
  function openBookingModal(isEdit = false, reservation = null) {
      bookingForm.reset();
      otherPurposeGroup.style.display = 'none';
      reservationIdInput.value = '';
      modalDeleteButton.style.display = 'none';
      modalDeleteButton.onclick = null;
      backupWarningMessage.style.display = 'none';

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

            const isOverlapping = window.currentReservations.some(r => {
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
  
  if(purposeSelect) {
    purposeSelect.addEventListener('change', () => {
        otherPurposeGroup.style.display = (purposeSelect.value === 'Jiný') ? 'block' : 'none';
    });
  }

  function getToken() {
    return localStorage.getItem("authToken");
  }

  function initializeDatePicker() {
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
        
        if (primaryReservation) {
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
      if (clearSelectionButton) clearSelectionButton.style.display = 'inline-block';
        } else {
            renderReservationsOverview(instance.currentMonth, instance.currentYear);
      if (clearSelectionButton) clearSelectionButton.style.display = 'none';
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

  if (clearSelectionButton) {
    clearSelectionButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (!flatpickrInstance) return;
      flatpickrInstance.clear();
      document.getElementById("check-in-date-display").textContent = "- Vyberte -";
      document.getElementById("check-out-date-display").textContent = "- Vyberte -";
      if (openModalButton) openModalButton.style.display = 'none';
      clearSelectionButton.style.display = 'none';
      renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
    });
  }

  async function loadReservations() {
    if (reservationsListDiv) reservationsListDiv.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    
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
        renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
      } else {
        initializeDatePicker();
        setTimeout(() => {
          if (flatpickrInstance) {
              renderReservationsOverview(flatpickrInstance.currentMonth, flatpickrInstance.currentYear);
          }
        }, 50);
      }
      
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

        let currentMonth, currentYear;
        if(flatpickrInstance) {
          currentMonth = flatpickrInstance.currentMonth;
          currentYear = flatpickrInstance.currentYear;
        }

        let purpose = purposeSelect.value;
        if (purpose === 'Jiný') {
            purpose = otherPurposeInput.value.trim();
        }

        const notes = notesTextarea.value.trim();
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

        if (isEditMode) {
            const fromInput = document.getElementById('edit-from-date');
            const toInput = document.getElementById('edit-to-date');
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
        
            if (!isEditMode && flatpickrInstance) {
                flatpickrInstance.clear();
                document.getElementById("check-in-date-display").textContent = "- Vyberte -";
                document.getElementById("check-out-date-display").textContent = "- Vyberte -";
                if(openModalButton) openModalButton.style.display = 'none';
            }
            
            await loadReservations();
            
            if(flatpickrInstance && currentMonth !== undefined && currentYear !== undefined) {
              flatpickrInstance.changeMonth(currentMonth, false);
              flatpickrInstance.jumpToDate(new Date(currentYear, currentMonth));
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
          const userIsAdmin = localStorage.getItem('role') === 'admin';


          reservations.forEach((r) => {
              const listItem = document.createElement("li");
              const notesHTML = r.notes 
                  ? `<p><strong>Poznámka:</strong> ${r.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` 
                  : '';
              
              let actionButtonsHTML = '';
              if (loggedInUserId === r.userId || userIsAdmin) {
                  actionButtonsHTML = `
                  <div class="action-buttons">
                      <button class="edit-btn" data-id="${r.id}" title="Upravit rezervaci"><i class="fas fa-pencil-alt"></i></button>
                      <button class="delete-btn" data-id="${r.id}" title="Smazat rezervaci"><i class="fas fa-trash-alt"></i></button>
                  </div>`;
              }

              let statusBadge = '';
              if (r.status === 'backup') {
                  statusBadge = '<span class="status-badge backup">Záložní</span>';
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

  window.addEventListener('click', (event) => {
      if (event.target === bookingModal) closeBookingModal();
      if (event.target === confirmDeleteModal) closeConfirmDeleteModal();
      if (event.target === iconSelectModal) iconSelectModal.style.display = 'none';
      if (event.target === priceSplitModal) priceSplitModal.style.display = 'none';
  });

  // --- Shopping List Logic ---

  async function fetchUsers() {
    try {
      const token = getToken();
      const response = await fetch(`${backendUrl}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Nepodařilo se načíst uživatele.');
      allUsers = await response.json();
    } catch (error) {
      console.error("Chyba při načítání uživatelů:", error);
      allUsers = [];
    }
  }

  async function loadShoppingList() {
    shoppingListDiv.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    const token = getToken();
    try {
      const response = await fetch(`${backendUrl}/api/shopping-list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Nepodařilo se načíst seznam.');
      const items = await response.json();
      renderShoppingList(items);
    } catch (error) {
      shoppingListDiv.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
  }

  function renderShoppingList(items) {
    shoppingListDiv.innerHTML = '';
    const toBuyList = document.createElement('ul');
    const purchasedList = document.createElement('ul');

    items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const loggedInUserId = localStorage.getItem('userId');
    const isAdmin = localStorage.getItem('role') === 'admin';

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = `shopping-list-item ${item.purchased ? 'purchased' : ''}`;
      li.dataset.id = item.id;
      
      const canDelete = isAdmin || (item.addedById === loggedInUserId);
      const deleteBtn = canDelete ? `<button class="delete-item-btn" title="Smazat"><i class="fas fa-times"></i></button>` : '';

      const detailsHTML = `<span class="added-by">Přidal: ${item.addedBy}</span>`;
      
      let priceHTML = '';
      if (item.purchased && item.price) {
          let splitHTML = '';
          if (item.splitWith && item.splitWith.length > 0) {
              const allSharers = [item.purchasedById, ...item.splitWith];
              const pricePerPerson = (item.price / allSharers.length).toFixed(2);
              const splitUsernames = item.splitWith.map(userId => allUsers.find(u => u.id === userId)?.username).filter(Boolean);
              splitHTML = `<div class="split-info">Rozděleno s: ${splitUsernames.join(', ')} (${pricePerPerson} Kč/os.)</div>`;
          }
          priceHTML = `
            <div class="price-info">
              <div class="paid-by">Zaplatil(a): <strong>${item.purchasedBy} ${item.price} Kč</strong></div>
              ${splitHTML}
            </div>`;
      }


      li.innerHTML = `
        <div class="item-main-info">
          <i class="${item.icon || 'fas fa-shopping-basket'} item-icon"></i>
          <span class="item-name">${item.name}</span>
          ${deleteBtn}
          <input type="checkbox" class="purchase-checkbox" ${item.purchased ? 'checked' : ''} title="Označit jako koupené">
        </div>
        <div class="item-details">${detailsHTML}</div>
        ${priceHTML}
        <div class="purchase-form">
            <input type="number" class="price-input" placeholder="Cena (Kč)" min="0" step="0.01">
            <button class="save-purchase-btn">Uložit</button>
            <button class="split-purchase-btn">Rozdělit</button>
        </div>
      `;
      
      if(item.purchased) {
        purchasedList.appendChild(li);
      } else {
        toBuyList.appendChild(li);
      }
    });

    if(toBuyList.hasChildNodes()){
      const h3ToBuy = document.createElement('h3');
      h3ToBuy.textContent = 'Koupit';
      shoppingListDiv.appendChild(h3ToBuy);
      shoppingListDiv.appendChild(toBuyList);
    }
    
    if(purchasedList.hasChildNodes()){
      const h3Purchased = document.createElement('h3');
      h3Purchased.textContent = 'Koupeno';
      shoppingListDiv.appendChild(h3Purchased);
      shoppingListDiv.appendChild(purchasedList);
    }
    
    if(!shoppingListDiv.hasChildNodes()){
      shoppingListDiv.innerHTML = '<p><i>Seznam je prázdný.</i></p>';
    }
  }

  if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = itemNameInput.value.trim();
      const icon = itemIconInput.value;
      if (!name) return;
      
      const token = getToken();
      try {
        const response = await fetch(`${backendUrl}/api/shopping-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ name, icon })
        });
        if (!response.ok) throw new Error('Chyba při přidávání položky.');
        
        itemNameInput.value = '';
        itemIconInput.value = 'fas fa-shopping-basket'; // Reset na výchozí
        openIconModalBtn.querySelector('i').className = 'fas fa-shopping-basket';
        
        loadShoppingList();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  shoppingListDiv.addEventListener('change', e => {
    if (e.target.classList.contains('purchase-checkbox')) {
      const li = e.target.closest('.shopping-list-item');
      const purchaseForm = li.querySelector('.purchase-form');
      if (e.target.checked) {
        purchaseForm.style.display = 'flex';
        li.querySelector('.price-input').focus();
      } else {
        purchaseForm.style.display = 'none';
        updatePurchaseStatus(li.dataset.id, false, null, []);
      }
    }
  });

  shoppingListDiv.addEventListener('click', e => {
    const target = e.target;
    if(target.closest('.save-purchase-btn')) {
      const li = target.closest('.shopping-list-item');
      const priceInput = li.querySelector('.price-input');
      const price = priceInput.value ? parseFloat(priceInput.value) : null;
      updatePurchaseStatus(li.dataset.id, true, price, []);
    }
    if(target.closest('.split-purchase-btn')) {
      const li = target.closest('.shopping-list-item');
      const priceInput = li.querySelector('.price-input');
      const price = priceInput.value ? parseFloat(priceInput.value) : null;
      if (price === null || price <= 0) {
        alert("Prosím, zadejte platnou cenu před rozdělením.");
        return;
      }
      openPriceSplitModal(li.dataset.id, price);
    }
    if(target.closest('.delete-item-btn')) {
      const li = target.closest('.shopping-list-item');
      if(confirm('Opravdu chcete smazat tuto položku?')) {
        deleteShoppingItem(li.dataset.id);
      }
    }
  });

  function openPriceSplitModal(itemId, price) {
    userSplitList.innerHTML = '';
    const loggedInUserId = localStorage.getItem('userId');

    allUsers.forEach(user => {
      if (user.id !== loggedInUserId) {
        const div = document.createElement('div');
        div.className = 'user-split-item';
        div.innerHTML = `
          <input type="checkbox" id="user-split-${user.id}" value="${user.id}">
          <label for="user-split-${user.id}">${user.username}</label>
        `;
        userSplitList.appendChild(div);
      }
    });
    
    splitModalInfo.textContent = `Rozdělit ${price} Kč mezi vybrané uživatele:`
    priceSplitForm.dataset.itemId = itemId;
    priceSplitForm.dataset.price = price;
    priceSplitModal.style.display = 'flex';
  }

  if (priceSplitForm) {
    priceSplitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const itemId = e.target.dataset.itemId;
      const price = parseFloat(e.target.dataset.price);
      
      const selectedUsers = Array.from(userSplitList.querySelectorAll('input:checked')).map(input => input.value);
      
      await updatePurchaseStatus(itemId, true, price, selectedUsers);
      
      priceSplitModal.style.display = 'none';
    });
  }


  async function updatePurchaseStatus(id, purchased, price = null, splitWith = []) {
      const token = getToken();
      try {
          const response = await fetch(`${backendUrl}/api/shopping-list/${id}/purchase`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ purchased, price, splitWith })
          });
          if (!response.ok) throw new Error('Chyba při aktualizaci.');
          loadShoppingList();
      } catch (error) {
          alert(error.message);
          loadShoppingList(); // Re-render to revert checkbox state on failure
      }
  }

  async function deleteShoppingItem(id) {
    const token = getToken();
      try {
          const response = await fetch(`${backendUrl}/api/shopping-list/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Chyba při mazání položky.');
          }
          loadShoppingList();
      } catch (error) {
          alert(error.message);
      }
  }

  const icons = [
      'fas fa-shopping-basket', 'fas fa-utensils', 'fas fa-wine-glass-alt', 'fas fa-beer', 'fas fa-coffee',
      'fas fa-seedling', 'fas fa-hammer', 'fas fa-paint-roller', 'fas fa-lightbulb', 'fas fa-broom',
      'fas fa-soap', 'fas fa-toilet-paper', 'fas fa-bed', 'fas fa-gamepad', 'fas fa-book', 'fas fa-first-aid'
  ];
  
  if(iconGrid) {
      icons.forEach(iconClass => {
          const iconWrapper = document.createElement('div');
          iconWrapper.className = 'icon-wrapper';
          iconWrapper.dataset.icon = iconClass;
          iconWrapper.innerHTML = `<i class="${iconClass}"></i>`;
          iconGrid.appendChild(iconWrapper);
      });
  }

  if(openIconModalBtn) {
    openIconModalBtn.addEventListener('click', () => {
      iconSelectModal.style.display = 'flex';
    });
  }

  if(iconGrid) {
    iconGrid.addEventListener('click', e => {
      const wrapper = e.target.closest('.icon-wrapper');
      if (!wrapper) return;
      const iconClass = wrapper.dataset.icon;
      itemIconInput.value = iconClass;
      openIconModalBtn.querySelector('i').className = iconClass;
      iconSelectModal.style.display = 'none';
    });
  }

  // --- Notes (Nástěnka) Logic ---

  async function loadNotes() {
    notesListDiv.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    const token = getToken();
    try {
        const response = await fetch(`${backendUrl}/api/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Nepodařilo se načíst vzkazy.');
        const notes = await response.json();
        renderNotes(notes);
    } catch (error) {
        notesListDiv.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
  }

  function renderNotes(notes) {
    notesListDiv.innerHTML = '';
    if (notes.length === 0) {
        notesListDiv.innerHTML = '<p><i>Zatím tu nejsou žádné vzkazy.</i></p>';
        return;
    }

    notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const loggedInUserId = localStorage.getItem('userId');
    const isAdmin = localStorage.getItem('role') === 'admin';

    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item';
        noteEl.dataset.id = note.id;

        const canDelete = isAdmin || (note.userId === loggedInUserId);
        const deleteBtn = canDelete ? `<button class="delete-note-btn" title="Smazat vzkaz"><i class="fas fa-times"></i></button>` : '';

        const date = new Date(note.createdAt);
        const formattedDate = `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()} v ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        noteEl.innerHTML = `
            ${deleteBtn}
            <p class="note-content">${note.message.replace(/\n/g, '<br>')}</p>
            <div class="note-meta">
                <strong>${note.username}</strong>, ${formattedDate}
            </div>
        `;
        notesListDiv.appendChild(noteEl);
    });
  }
  
  if(addNoteForm) {
    addNoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = noteMessageInput.value.trim();
        if (!message) return;

        const token = getToken();
        try {
            const response = await fetch(`${backendUrl}/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message })
            });
            if (!response.ok) throw new Error('Chyba při přidávání vzkazu.');
            
            noteMessageInput.value = '';
            await loadNotes();
        } catch (error) {
            alert(error.message);
        }
    });
  }

  if (notesListDiv) {
    notesListDiv.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-note-btn');
        if (!deleteBtn) return;

        const noteItem = deleteBtn.closest('.note-item');
        const noteId = noteItem.dataset.id;
        
        if (confirm('Opravdu chcete smazat tento vzkaz?')) {
            const token = getToken();
            try {
                const response = await fetch(`${backendUrl}/api/notes/${noteId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Chyba při mazání vzkazu.');
                await loadNotes();
            } catch (error) {
                alert(error.message);
            }
        }
    });
  }


  const initialToken = getToken();
  const initialUsername = localStorage.getItem("username");
  if (initialToken && initialUsername) {
    showApp(initialUsername);
  } else {
    showLogin();
  }
});


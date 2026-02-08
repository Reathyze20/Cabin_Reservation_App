document.addEventListener("DOMContentLoaded", () => {
    const appContainer = document.getElementById("app-container");
    const authContainer = document.getElementById("auth-container");
    const loggedInUsernameElement = document.getElementById("logged-in-username");
    const logoutButton = document.getElementById("logout-button");
    
    const listIdea = document.getElementById("list-idea");
    const listCompany = document.getElementById("list-company");
    const listTask = document.getElementById("list-task");
    const totalBudgetEl = document.getElementById("total-budget");

    // Old global button removed, logic updated below
    const modal = document.getElementById("add-reconstruction-modal");
    const form = document.getElementById("add-reconstruction-form");
    const categorySelect = document.getElementById("rec-category");
    const costGroup = document.getElementById("cost-group");
    const modalCloseBtn = modal.querySelector(".modal-close-button");

    const backendUrl = "";
    let currentUserId = Common.userId;

    // Auth Check — use Common module
    if (Common.checkAuth(appContainer, authContainer, loggedInUsernameElement)) {
        loadItems();
    }
    Common.setupLogout(logoutButton);

    // Use shared API helpers from common.js
    const apiFetch = Common.authFetch;

    // --- Load Data ---
    async function loadItems() {
        const items = await apiFetch(`${backendUrl}/api/reconstruction`);
        if (items) {
            renderBoard(items);
        }
    }

    function renderBoard(items) {
        listIdea.innerHTML = "";
        listCompany.innerHTML = "";
        listTask.innerHTML = "";
        let totalBudget = 0;

        items.forEach(item => {
            const card = createCard(item);
            if (item.category === "idea") listIdea.appendChild(card);
            else if (item.category === "company") listCompany.appendChild(card);
            else if (item.category === "task") {
                listTask.appendChild(card);
                if(item.cost) totalBudget += item.cost;
            }
        });

        totalBudgetEl.textContent = totalBudget.toLocaleString('cs-CZ') + " Kč";
    }

    function createCard(item) {
        const el = document.createElement("div");
        el.className = `kanban-card card-${item.category}`;
        
        // Link handling
        let linkHtml = "";
        if (item.link) {
            const isUrl = item.link.startsWith("http");
            const href = isUrl ? item.link : "#";
            const icon = isUrl ? "fa-external-link-alt" : "fa-phone";
            linkHtml = `<a href="${href}" target="_blank" class="card-link" title="${item.link}"><i class="fas ${icon}"></i> ${isUrl ? "Otevřít" : item.link}</a>`;
        }

        // Cost handling
        let costHtml = "";
        if (item.category === "task" && item.cost) {
            costHtml = `<div class="card-cost">${item.cost.toLocaleString('cs-CZ')} Kč</div>`;
        }

        // Votes handling (only for Idea)
        let votesHtml = "";
        if (item.category === "idea") {
            const hasVoted = item.votes.includes(currentUserId);
            votesHtml = `
                <button class="vote-btn ${hasVoted ? 'voted' : ''}" onclick="toggleVote('${item.id}')">
                    <i class="fas fa-heart"></i> ${item.votes.length}
                </button>
            `;
        }

        // Status handling (only for Task)
        let statusHtml = "";
        if (item.category === "task") {
            const statusMap = { 'pending': 'Čeká se', 'approved': 'Schváleno', 'done': 'Hotovo' };
            const statusClass = { 'pending': 'badge-warn', 'approved': 'badge-info', 'done': 'badge-success' };
            statusHtml = `
                <div class="status-select-wrapper">
                    <span class="status-badge ${statusClass[item.status]}">${statusMap[item.status]}</span>
                    <select onchange="changeStatus('${item.id}', this.value)" class="status-select">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Čeká se</option>
                        <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>Schváleno</option>
                        <option value="done" ${item.status === 'done' ? 'selected' : ''}>Hotovo</option>
                    </select>
                </div>
            `;
        }

        const deleteBtn = `<button class="delete-card-btn" onclick="deleteItem('${item.id}')"><i class="fas fa-trash"></i></button>`;

        el.innerHTML = `
            <div class="card-header-row">
                <h4>${item.title}</h4>
                ${deleteBtn}
            </div>
            <p class="card-desc">${item.description.replace(/\n/g, '<br>')}</p>
            ${linkHtml}
            ${costHtml}
            <div class="card-footer">
                <span class="card-author">${item.createdBy}</span>
                ${votesHtml}
                ${statusHtml}
            </div>
        `;
        return el;
    }

    // --- Actions ---
    window.toggleVote = async (id) => {
        await apiFetch(`${backendUrl}/api/reconstruction/${id}/vote`, { method: "PATCH" });
        loadItems();
    };

    window.deleteItem = async (id) => {
        if(confirm("Opravdu smazat?")) {
            await apiFetch(`${backendUrl}/api/reconstruction/${id}`, { method: "DELETE" });
            loadItems();
        }
    };

    window.changeStatus = async (id, newStatus) => {
        await apiFetch(`${backendUrl}/api/reconstruction/${id}/status`, { 
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });
        loadItems();
    };

    // --- Modal Logic (UPDATED) ---
    // Připojení event listenerů na tlačítka v hlavičkách sloupců
    document.querySelectorAll('.add-col-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = btn.getAttribute('data-category'); // Získáme kategorii z tlačítka
            
            // Nastavíme hodnotu v selectu
            categorySelect.value = category;
            
            // Vyvoláme change event, aby se zobrazilo/skrylo pole pro cenu (cost-group)
            categorySelect.dispatchEvent(new Event('change'));
            
            modal.style.display = "flex";
        });
    });

    modalCloseBtn.addEventListener("click", () => modal.style.display = "none");
    window.addEventListener("click", (e) => { if(e.target === modal) modal.style.display = "none"; });

    categorySelect.addEventListener("change", () => {
        costGroup.style.display = categorySelect.value === "task" ? "block" : "none";
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            category: categorySelect.value,
            title: document.getElementById("rec-title").value,
            description: document.getElementById("rec-desc").value,
            link: document.getElementById("rec-link").value,
            cost: document.getElementById("rec-cost").value
        };

        const result = await apiFetch(`${backendUrl}/api/reconstruction`, {
            method: "POST",
            body: JSON.stringify(data)
        });

        if (result) {
            modal.style.display = "none";
            form.reset();
            loadItems();
        }
    });
});
/* ============================================================================
   pages/reconstruction.ts — Kanban board for reconstruction ideas/tasks
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, getUserId } from '../lib/common';
import { showConfirm } from '../lib/dialogs';

let container: HTMLElement;
let items: any[] = [];

function getTemplate(): string {
  return `
  <div class="main-content-reconstruction">
    <div class="reconstruction-card">
      <div class="reconstruction-header">
        <h2>Rekonstrukce</h2>
        <div class="budget-container">
          <div class="budget-labels">
            <span class="budget-title">Celkový rozpočet</span>
            <span class="budget-amount"><strong id="total-budget">0 Kč</strong></span>
          </div>
          <div class="budget-progress-bar">
            <div class="budget-progress-fill" id="budget-progress" style="width: 0%"></div>
          </div>
          <div class="budget-details">
            <span id="budget-spent">Utraceno: 0 Kč</span>
            <span id="budget-planned">Plánováno: 0 Kč</span>
          </div>
        </div>
      </div>
      <div class="kanban-board">
        <!-- Idea column -->
        <div class="kanban-column col-navrzeno">
          <div class="kanban-column-header">
            Nápady
            <button class="add-col-btn gallery-btn" data-category="idea" style="margin-left:auto">+</button>
          </div>
          <div class="kanban-column-body" id="list-idea"></div>
        </div>
        <!-- Company column -->
        <div class="kanban-column col-schvaleno">
          <div class="kanban-column-header">
            Firmy / Kontakty
            <button class="add-col-btn gallery-btn" data-category="company" style="margin-left:auto">+</button>
          </div>
          <div class="kanban-column-body" id="list-company"></div>
        </div>
        <!-- Task column -->
        <div class="kanban-column col-probehlo">
          <div class="kanban-column-header">
            Úkoly
            <button class="add-col-btn gallery-btn" data-category="task" style="margin-left:auto">+</button>
          </div>
          <div class="kanban-column-body" id="list-task"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add item modal -->
  <div id="add-reconstruction-modal" class="modal-overlay hidden">
    <div class="modal-content rec-modal-content">

      <div class="rec-modal-header">
        <h2 id="add-reconstruction-title">Nová položka</h2>
        <button class="modal-close-btn-icon" data-close="add-reconstruction-modal" title="Zavřít">
          ×
        </button>
      </div>

      <form id="add-reconstruction-form">
        <input type="hidden" id="rec-id" />
        <div class="form-group hidden">
          <select id="rec-category">
            <option value="idea">Nápad</option>
            <option value="company">Firma / Kontakt</option>
            <option value="task">Úkol</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="rec-title">Název <span class="label-required">*</span></label>
          <input type="text" id="rec-title" class="form-input" placeholder="Stručný název položky" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="rec-desc">Popis / Poznámka</label>
          <textarea id="rec-desc" class="form-input" rows="3" placeholder="Podrobnosti, důvody, parametry…"></textarea>
        </div>

        <!-- Nápad -->
        <div id="dynamic-fields-idea" class="dynamic-fields">
          <div class="form-group">
            <label class="form-label" for="rec-link-idea">Odkaz na e-shop / inspiraci</label>
            <input type="url" id="rec-link-idea" class="form-input" placeholder="https://www.example.cz/produkt" />
          </div>
          <div class="form-group">
            <label class="form-label" for="rec-thumbnail">Náhledový obrázek (URL)</label>
            <input type="url" id="rec-thumbnail" class="form-input" placeholder="https://cdn.example.cz/obrazek.jpg" />
          </div>
          <div class="form-group">
            <label class="form-label" for="rec-cost-idea">Odhadovaná cena (Kč)</label>
            <input type="number" id="rec-cost-idea" class="form-input" placeholder="0" min="0" step="100" />
          </div>
        </div>

        <!-- Firma -->
        <div id="dynamic-fields-company" class="dynamic-fields hidden">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="rec-phone">Telefon</label>
              <input type="tel" id="rec-phone" class="form-input" placeholder="+420 123 456 789" />
            </div>
            <div class="form-group">
              <label class="form-label" for="rec-email">E-mail</label>
              <input type="email" id="rec-email" class="form-input" placeholder="firma@example.cz" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="rec-link-company">Web / Odkaz</label>
            <input type="url" id="rec-link-company" class="form-input" placeholder="https://www.firma.cz" />
          </div>
          <div class="form-group">
            <label class="form-label" for="rec-status-company">Stav spolupráce</label>
            <select id="rec-status-company" class="form-input">
              <option value="pending">K oslovení</option>
              <option value="contacted">Čekám na nacenění</option>
              <option value="approved">Schváleno</option>
              <option value="rejected">Zamítnuto</option>
            </select>
          </div>
        </div>

        <!-- Úkol -->
        <div id="dynamic-fields-task" class="dynamic-fields hidden">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="rec-deadline">Termín </label>
              <input type="date" id="rec-deadline" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label" for="rec-cost-task">Odhadovaná cena (Kč)</label>
              <input type="number" id="rec-cost-task" class="form-input" placeholder="0" min="0" step="100" />
            </div>
          </div>
        </div>

        <div class="rec-modal-footer">
          <button type="submit" class="button-primary rec-submit-btn">
            <span id="rec-submit-label">Přidat položku</span>
          </button>
        </div>

      </form>
    </div>
  </div>`;
}

async function loadItems(): Promise<void> {
  const data = await authFetch<any[]>('/api/reconstruction', { silent: true });
  if (data) { items = data; renderBoard(data); }
}

function renderBoard(list: any[]): void {
  const colIdea = $('list-idea');
  const colCompany = $('list-company');
  const colTask = $('list-task');
  const budgetEl = $('total-budget');
  const budgetSpentEl = $('budget-spent');
  const budgetPlannedEl = $('budget-planned');
  const budgetProgressEl = $('budget-progress');
  
  if (!colIdea || !colCompany || !colTask) return;
  colIdea.innerHTML = '';
  colCompany.innerHTML = '';
  colTask.innerHTML = '';
  
  let totalBudget = 0;
  let spentBudget = 0;
  let ideaCount = 0;
  let companyCount = 0;
  let taskCount = 0;

  for (const item of list) {
    const card = createCard(item);
    if (item.category === 'idea') {
      colIdea.appendChild(card);
      ideaCount++;
    } else if (item.category === 'company') {
      colCompany.appendChild(card);
      companyCount++;
    } else if (item.category === 'task') {
      colTask.appendChild(card);
      taskCount++;
      if (item.cost) {
        totalBudget += item.cost;
        if (item.status === 'done') {
          spentBudget += item.cost;
        }
      }
    }
  }

  // Empty states
  if (ideaCount === 0) {
    colIdea.innerHTML = `
      <div class="kanban-empty-state">
        <i class="fas fa-lightbulb" style="opacity: 0.4; color: #9ca3af;"></i>
        <p>Zatím žádné nápady. Přidejte odkaz nebo fotku.</p>
      </div>`;
  }
  if (companyCount === 0) {
    colCompany.innerHTML = `
      <div class="kanban-empty-state">
        <i class="fas fa-building" style="opacity: 0.4; color: #9ca3af;"></i>
        <p>Zatím žádné firmy. Přidejte kontakt na řemeslníka.</p>
      </div>`;
  }
  if (taskCount === 0) {
    colTask.innerHTML = `
      <div class="kanban-empty-state">
        <i class="fas fa-tasks" style="opacity: 0.4; color: #9ca3af;"></i>
        <p>Zatím žádné úkoly. Naplánujte další krok.</p>
      </div>`;
  }

  // Update budget UI
  if (budgetEl) budgetEl.textContent = totalBudget.toLocaleString('cs-CZ') + ' Kč';
  if (budgetSpentEl) budgetSpentEl.textContent = 'Utraceno: ' + spentBudget.toLocaleString('cs-CZ') + ' Kč';
  if (budgetPlannedEl) budgetPlannedEl.textContent = 'Plánováno: ' + totalBudget.toLocaleString('cs-CZ') + ' Kč';
  if (budgetProgressEl) {
    const percentage = totalBudget > 0 ? Math.min(100, (spentBudget / totalBudget) * 100) : 0;
    budgetProgressEl.style.width = percentage + '%';
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'K oslovení',
    contacted: 'Čekám na nacenění',
    approved: 'Schváleno',
    rejected: 'Zamítnuto',
    done: 'Hotovo'
  };
  return map[status] || status;
}

function isDeadlineNear(dateStr: string): boolean {
  const deadline = new Date(dateStr);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 3; // Near if within 3 days or passed
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('cs-CZ');
}

function createCard(item: any): HTMLElement {
  const el = document.createElement('div');
  el.className = `kanban-item ${item.category}-card ${item.status === 'done' ? 'task-done' : ''}`;

  let innerHtml = '';

  if (item.category === 'idea') {
    const myId = getUserId();
    const hasVoted = item.votes?.includes(myId);
    const votesHtml = `<button class="vote-btn ${hasVoted ? 'voted-up' : ''}" data-vote="${item.id}">❤️ ${item.votes?.length || 0}</button>`;
    
    innerHtml = `
      ${item.thumbnail ? `<div class="idea-thumbnail"><img src="${item.thumbnail}" alt="Náhled"></div>` : ''}
      <div class="idea-content">
        <div class="card-header">
          <div class="kanban-item-title">${item.title}</div>
          <div class="card-actions">
            ${item.link ? `<a href="${item.link}" target="_blank" class="card-action-link" title="Otevřít e-shop">↗</a>` : ''}
            <button class="card-action-edit" data-edit="${item.id}" title="Upravit">✎</button>
            <button class="card-action-del" data-del="${item.id}" title="Smazat">×</button>
          </div>
        </div>
        ${item.description ? `<div class="kanban-item-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
        <div class="card-footer">
          ${item.cost ? `<span class="card-cost">${item.cost.toLocaleString('cs-CZ')} Kč</span>` : '<span></span>'}
          ${votesHtml}
        </div>
      </div>
    `;
  } else if (item.category === 'company') {
    innerHtml = `
      <div class="card-header">
        <div class="kanban-item-title">${item.title}</div>
        <div class="card-actions">
          <button class="card-action-edit" data-edit="${item.id}" title="Upravit">✎</button>
          <button class="card-action-del" data-del="${item.id}" title="Smazat">×</button>
        </div>
      </div>
      <div class="company-status-badge status-${item.status || 'pending'}">${getStatusLabel(item.status || 'pending')}</div>
      ${item.description ? `<div class="kanban-item-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
      ${(item.phone || item.email || item.link) ? `
      <div class="company-contact-row">
        ${item.phone ? `<a href="tel:${item.phone}" class="company-action-btn">📞 Zavolat</a>` : ''}
        ${item.email ? `<a href="mailto:${item.email}" class="company-action-btn">✉️ Napsat</a>` : ''}
        ${item.link ? `<a href="${item.link}" target="_blank" class="company-action-btn">🌐 Web</a>` : ''}
      </div>` : ''}
    `;
  } else if (item.category === 'task') {
    innerHtml = `
      <div class="card-header">
        <div class="task-title-row">
          <label class="task-checkbox-wrapper">
            <input type="checkbox" class="task-checkbox" data-task-id="${item.id}" ${item.status === 'done' ? 'checked' : ''}>
            <span class="checkmark"></span>
          </label>
          <div class="kanban-item-title">${item.title}</div>
        </div>
        <div class="card-actions">
          <button class="card-action-edit" data-edit="${item.id}" title="Upravit">✎</button>
          <button class="card-action-del" data-del="${item.id}" title="Smazat">×</button>
        </div>
      </div>
      ${item.description ? `<div class="kanban-item-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
      ${(item.cost || item.deadline) ? `
      <div class="card-footer">
        ${item.cost ? `<span class="card-cost">${item.cost.toLocaleString('cs-CZ')} Kč</span>` : '<span></span>'}
        ${item.deadline ? `<span class="task-deadline ${isDeadlineNear(item.deadline) ? 'deadline-near' : ''}">📅 ${formatDate(item.deadline)}</span>` : ''}
      </div>` : ''}
    `;
  }

  el.innerHTML = innerHtml;
  return el;
}

function bindEvents(): void {
  // Close buttons
  container.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { const el = $(btn.dataset.close!); if (el) hide(el); });
  });
  // Add column buttons
  container.querySelectorAll<HTMLButtonElement>('.add-col-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      $<HTMLInputElement>('rec-id')!.value = '';
      $<HTMLFormElement>('add-reconstruction-form')?.reset();
      const sel = $<HTMLSelectElement>('rec-category');
      if (sel && cat) { sel.value = cat; sel.dispatchEvent(new Event('change')); }
      show($('add-reconstruction-modal'));
    });
  });

  // Category change → toggle dynamic fields
  $<HTMLSelectElement>('rec-category')?.addEventListener('change', (e) => {
    const cat = (e.target as HTMLSelectElement).value;
    container.querySelectorAll('.dynamic-fields').forEach(el => el.classList.add('hidden'));
    const target = $(`dynamic-fields-${cat}`);
    if (target) target.classList.remove('hidden');

    const titleEl = $('add-reconstruction-title');
    const submitLabel = $('rec-submit-label');
    const isEdit = !!($<HTMLInputElement>('rec-id')?.value);
    const labels: Record<string, string> = {
      idea: 'Nápad & Inspirace',
      company: 'Firma / Kontakt',
      task: 'Úkol & Rozpočet',
    };
    if (titleEl) titleEl.textContent = isEdit
      ? `Upravit — ${labels[cat] ?? 'Položku'}`
      : `Nová položka — ${labels[cat] ?? ''}`;
    if (submitLabel) submitLabel.textContent = isEdit ? 'Uložit změny' : 'Přidat položku';
  });

  // Form submit
  $<HTMLFormElement>('add-reconstruction-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cat = $<HTMLSelectElement>('rec-category')!.value;
    const id = $<HTMLInputElement>('rec-id')?.value;
    
    const data: any = {
      category: cat,
      title: $<HTMLInputElement>('rec-title')!.value,
      description: $<HTMLTextAreaElement>('rec-desc')?.value || '',
    };

    if (cat === 'idea') {
      data.link = $<HTMLInputElement>('rec-link-idea')?.value || '';
      data.thumbnail = $<HTMLInputElement>('rec-thumbnail')?.value || '';
      data.cost = $<HTMLInputElement>('rec-cost-idea')?.value ? Number($<HTMLInputElement>('rec-cost-idea')?.value) : undefined;
    } else if (cat === 'company') {
      data.phone = $<HTMLInputElement>('rec-phone')?.value || '';
      data.email = $<HTMLInputElement>('rec-email')?.value || '';
      data.link = $<HTMLInputElement>('rec-link-company')?.value || '';
      data.status = $<HTMLSelectElement>('rec-status-company')?.value || 'pending';
    } else if (cat === 'task') {
      data.deadline = $<HTMLInputElement>('rec-deadline')?.value || '';
      data.cost = $<HTMLInputElement>('rec-cost-task')?.value ? Number($<HTMLInputElement>('rec-cost-task')?.value) : undefined;
    }

    const url = id ? `/api/reconstruction/${id}` : '/api/reconstruction';
    const method = id ? 'PUT' : 'POST';

    const r = await authFetch(url, { method, body: JSON.stringify(data) });
    if (r) {
      hide($('add-reconstruction-modal'));
      $<HTMLFormElement>('add-reconstruction-form')?.reset();
      $<HTMLInputElement>('rec-id')!.value = '';
      // Reset dynamic fields visibility
      $<HTMLSelectElement>('rec-category')?.dispatchEvent(new Event('change'));
      loadItems();
    }
  });

  // Event delegation for cards (vote, delete, status)
  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    
    // Task checkbox
    if (target.classList.contains('task-checkbox')) {
      const cb = target as HTMLInputElement;
      const id = cb.dataset.taskId;
      if (id) {
        const newStatus = cb.checked ? 'done' : 'pending';
        await authFetch(`/api/reconstruction/${id}/status`, { 
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        });
        loadItems();
      }
      return;
    }

    const voteBtn = target.closest<HTMLButtonElement>('[data-vote]');
    if (voteBtn) {
      await authFetch(`/api/reconstruction/${voteBtn.dataset.vote}/vote`, { method: 'PATCH' });
      loadItems();
      return;
    }
    const delBtn = target.closest<HTMLButtonElement>('[data-del]');
    if (delBtn) {
      const confirmed = await showConfirm('Smazat položku?', 'Opravdu chcete smazat tuto položku?', true);
      if (!confirmed) return;
      await authFetch(`/api/reconstruction/${delBtn.dataset.del}`, { method: 'DELETE' });
      loadItems();
      return;
    }

    const editBtn = target.closest<HTMLButtonElement>('[data-edit]');
    if (editBtn) {
      const id = editBtn.dataset.edit;
      const item = items.find(i => i.id === id);
      if (item) {
        $<HTMLInputElement>('rec-id')!.value = item.id;
        const sel = $<HTMLSelectElement>('rec-category');
        if (sel) { sel.value = item.category; sel.dispatchEvent(new Event('change')); }
        
        $<HTMLInputElement>('rec-title')!.value = item.title || '';
        $<HTMLTextAreaElement>('rec-desc')!.value = item.description || '';

        if (item.category === 'idea') {
          $<HTMLInputElement>('rec-link-idea')!.value = item.link || '';
          $<HTMLInputElement>('rec-thumbnail')!.value = item.thumbnail || '';
          $<HTMLInputElement>('rec-cost-idea')!.value = item.cost || '';
        } else if (item.category === 'company') {
          $<HTMLInputElement>('rec-phone')!.value = item.phone || '';
          $<HTMLInputElement>('rec-email')!.value = item.email || '';
          $<HTMLInputElement>('rec-link-company')!.value = item.link || '';
          $<HTMLSelectElement>('rec-status-company')!.value = item.status || 'pending';
        } else if (item.category === 'task') {
          $<HTMLInputElement>('rec-deadline')!.value = item.deadline ? item.deadline.split('T')[0] : '';
          $<HTMLInputElement>('rec-cost-task')!.value = item.cost || '';
        }

        show($('add-reconstruction-modal'));
      }
      return;
    }
  });

  container.addEventListener('change', async (e) => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-status-id]');
    if (sel) {
      await authFetch(`/api/reconstruction/${sel.dataset.statusId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status: sel.value }),
      });
      loadItems();
    }
  });
}

const reconstructionPage: PageModule = {
  async mount(el) {
    container = el;
    el.innerHTML = getTemplate();
    bindEvents();
    await loadItems();
  },
  unmount() { items = []; },
};

export default reconstructionPage;

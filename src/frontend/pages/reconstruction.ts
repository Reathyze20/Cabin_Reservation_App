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
        <h2><i class="fas fa-hammer"></i> Rekonstrukce</h2>
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
            <i class="fas fa-lightbulb"></i> Nápady
            <button class="add-col-btn gallery-btn" data-category="idea" style="margin-left:auto"><i class="fas fa-plus"></i></button>
          </div>
          <div class="kanban-column-body" id="list-idea"></div>
        </div>
        <!-- Company column -->
        <div class="kanban-column col-schvaleno">
          <div class="kanban-column-header">
            <i class="fas fa-building"></i> Firmy / Kontakty
            <button class="add-col-btn gallery-btn" data-category="company" style="margin-left:auto"><i class="fas fa-plus"></i></button>
          </div>
          <div class="kanban-column-body" id="list-company"></div>
        </div>
        <!-- Task column -->
        <div class="kanban-column col-probehlo">
          <div class="kanban-column-header">
            <i class="fas fa-tasks"></i> Úkoly
            <button class="add-col-btn gallery-btn" data-category="task" style="margin-left:auto"><i class="fas fa-plus"></i></button>
          </div>
          <div class="kanban-column-body" id="list-task"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add item modal -->
  <div id="add-reconstruction-modal" class="modal-overlay hidden">
    <div class="modal-content">
      <span class="modal-close-button" data-close="add-reconstruction-modal">&times;</span>
      <h2>Nová položka</h2>
      <form id="add-reconstruction-form">
        <div class="form-group">
          <label>Kategorie</label>
          <select id="rec-category">
            <option value="idea">Nápad</option>
            <option value="company">Firma / Kontakt</option>
            <option value="task">Úkol</option>
          </select>
        </div>
        <div class="form-group"><label>Název</label><input type="text" id="rec-title" required /></div>
        <div class="form-group"><label>Popis</label><textarea id="rec-desc" rows="3"></textarea></div>
        
        <!-- Dynamic fields based on category -->
        <div id="dynamic-fields-idea" class="dynamic-fields">
          <div class="form-group"><label>Odkaz na e-shop</label><input type="url" id="rec-link-idea" placeholder="https://" /></div>
          <div class="form-group"><label>Náhledový obrázek (URL)</label><input type="url" id="rec-thumbnail" placeholder="https://" /></div>
          <div class="form-group"><label>Štítek (Kategorie)</label><input type="text" id="rec-tag" placeholder="např. Podlaha, Spotřebiče" /></div>
          <div class="form-group"><label>Odhadovaná cena (Kč)</label><input type="number" id="rec-cost-idea" /></div>
        </div>

        <div id="dynamic-fields-company" class="dynamic-fields hidden">
          <div class="form-group"><label>Specializace</label><input type="text" id="rec-specialization" placeholder="např. Truhlář, Instalatér" /></div>
          <div class="form-group"><label>Telefon</label><input type="tel" id="rec-phone" /></div>
          <div class="form-group"><label>E-mail</label><input type="email" id="rec-email" /></div>
          <div class="form-group"><label>Web</label><input type="url" id="rec-link-company" placeholder="https://" /></div>
          <div class="form-group">
            <label>Stav</label>
            <select id="rec-status-company">
              <option value="pending">K oslovení</option>
              <option value="contacted">Čekám na nacenění</option>
              <option value="approved">Schváleno</option>
              <option value="rejected">Zamítnuto</option>
            </select>
          </div>
        </div>

        <div id="dynamic-fields-task" class="dynamic-fields hidden">
          <div class="form-group"><label>Termín (Deadline)</label><input type="date" id="rec-deadline" /></div>
          <div class="form-group"><label>Odhadovaná cena (Kč)</label><input type="number" id="rec-cost-task" /></div>
        </div>

        <div class="modal-buttons"><button type="submit" class="button-primary">Přidat</button></div>
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
        <i class="fas fa-lightbulb"></i>
        <p>Zatím žádné nápady. Přidejte odkaz nebo fotku.</p>
      </div>`;
  }
  if (companyCount === 0) {
    colCompany.innerHTML = `
      <div class="kanban-empty-state">
        <i class="fas fa-building"></i>
        <p>Zatím žádné firmy. Přidejte kontakt na řemeslníka.</p>
      </div>`;
  }
  if (taskCount === 0) {
    colTask.innerHTML = `
      <div class="kanban-empty-state">
        <i class="fas fa-tasks"></i>
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
    const votesHtml = `<button class="vote-btn ${hasVoted ? 'voted-up' : ''}" data-vote="${item.id}"><i class="fas fa-heart"></i> ${item.votes?.length || 0}</button>`;
    
    innerHtml = `
      ${item.thumbnail ? `<div class="idea-thumbnail"><img src="${item.thumbnail}" alt="Náhled"></div>` : ''}
      <div class="idea-content">
        <div class="idea-header">
          ${item.tag ? `<span class="idea-tag">${item.tag}</span>` : '<span></span>'}
          <div class="idea-actions">
            ${item.link ? `<a href="${item.link}" target="_blank" class="idea-link" title="Otevřít e-shop"><i class="fas fa-external-link-alt"></i></a>` : ''}
            <button class="delete-card-btn" data-del="${item.id}" title="Smazat"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="kanban-item-title">${item.title}</div>
        ${item.description ? `<div class="kanban-item-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
        <div class="idea-footer">
          ${item.cost ? `<span class="idea-cost">${item.cost.toLocaleString('cs-CZ')} Kč</span>` : '<span></span>'}
          ${votesHtml}
        </div>
      </div>
    `;
  } else if (item.category === 'company') {
    innerHtml = `
      <div class="company-header">
        <div class="company-title-group">
          <div class="kanban-item-title">${item.title}</div>
          ${item.specialization ? `<div class="company-specialization">${item.specialization}</div>` : ''}
        </div>
        <div class="company-status status-${item.status || 'pending'}">${getStatusLabel(item.status || 'pending')}</div>
      </div>
      ${item.description ? `<div class="kanban-item-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
      <div class="company-actions">
        ${item.phone ? `<a href="tel:${item.phone}" class="company-action-btn"><i class="fas fa-phone"></i> Zavolat</a>` : ''}
        ${item.email ? `<a href="mailto:${item.email}" class="company-action-btn"><i class="fas fa-envelope"></i> Napsat</a>` : ''}
        ${item.link ? `<a href="${item.link}" target="_blank" class="company-action-btn"><i class="fas fa-globe"></i> Web</a>` : ''}
        <button class="delete-card-btn" data-del="${item.id}" title="Smazat" style="margin-left: auto;"><i class="fas fa-trash"></i></button>
      </div>
    `;
  } else if (item.category === 'task') {
    innerHtml = `
      <div class="task-header">
        <label class="task-checkbox-wrapper">
          <input type="checkbox" class="task-checkbox" data-task-id="${item.id}" ${item.status === 'done' ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        <div class="kanban-item-title">${item.title}</div>
        <button class="delete-card-btn" data-del="${item.id}" title="Smazat" style="margin-left: auto;"><i class="fas fa-trash"></i></button>
      </div>
      ${item.description ? `<div class="kanban-item-desc">${item.description.replace(/\n/g, '<br>')}</div>` : ''}
      <div class="task-footer">
        ${item.cost ? `<span class="task-cost">${item.cost.toLocaleString('cs-CZ')} Kč</span>` : '<span></span>'}
        ${item.deadline ? `<span class="task-deadline ${isDeadlineNear(item.deadline) ? 'deadline-near' : ''}"><i class="far fa-calendar-alt"></i> ${formatDate(item.deadline)}</span>` : ''}
      </div>
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
  container.querySelectorAll<HTMLElement>('.modal-overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) hide(ov); });
  });

  // Add column buttons
  container.querySelectorAll<HTMLButtonElement>('.add-col-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
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
  });

  // Form submit
  $<HTMLFormElement>('add-reconstruction-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cat = $<HTMLSelectElement>('rec-category')!.value;
    
    const data: any = {
      category: cat,
      title: $<HTMLInputElement>('rec-title')!.value,
      description: $<HTMLTextAreaElement>('rec-desc')?.value || '',
    };

    if (cat === 'idea') {
      data.link = $<HTMLInputElement>('rec-link-idea')?.value || '';
      data.thumbnail = $<HTMLInputElement>('rec-thumbnail')?.value || '';
      data.tag = $<HTMLInputElement>('rec-tag')?.value || '';
      data.cost = $<HTMLInputElement>('rec-cost-idea')?.value || '';
    } else if (cat === 'company') {
      data.specialization = $<HTMLInputElement>('rec-specialization')?.value || '';
      data.phone = $<HTMLInputElement>('rec-phone')?.value || '';
      data.email = $<HTMLInputElement>('rec-email')?.value || '';
      data.link = $<HTMLInputElement>('rec-link-company')?.value || '';
      data.status = $<HTMLSelectElement>('rec-status-company')?.value || 'pending';
    } else if (cat === 'task') {
      data.deadline = $<HTMLInputElement>('rec-deadline')?.value || '';
      data.cost = $<HTMLInputElement>('rec-cost-task')?.value || '';
    }

    const r = await authFetch('/api/reconstruction', { method: 'POST', body: JSON.stringify(data) });
    if (r) {
      hide($('add-reconstruction-modal'));
      $<HTMLFormElement>('add-reconstruction-form')?.reset();
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

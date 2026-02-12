/* ============================================================================
   pages/reconstruction.ts — Kanban board for reconstruction ideas/tasks
   ============================================================================ */
import type { PageModule } from '../lib/router';
import { $, show, hide, showToast, authFetch, getUserId } from '../lib/common';

let container: HTMLElement;
let items: any[] = [];

function getTemplate(): string {
  return `
  <div class="main-content-reconstruction">
    <div class="reconstruction-card">
      <div class="reconstruction-header">
        <h2><i class="fas fa-hammer"></i> Rekonstrukce</h2>
        <div style="font-size:.9em;color:#6b7280">Celkový rozpočet: <strong id="total-budget">0 Kč</strong></div>
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
        <div class="form-group"><label>Odkaz / Kontakt</label><input type="text" id="rec-link" /></div>
        <div class="form-group hidden" id="cost-group"><label>Odhadovaná cena (Kč)</label><input type="number" id="rec-cost" /></div>
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
  if (!colIdea || !colCompany || !colTask) return;
  colIdea.innerHTML = '';
  colCompany.innerHTML = '';
  colTask.innerHTML = '';
  let budget = 0;

  for (const item of list) {
    const card = createCard(item);
    if (item.category === 'idea') colIdea.appendChild(card);
    else if (item.category === 'company') colCompany.appendChild(card);
    else if (item.category === 'task') {
      colTask.appendChild(card);
      if (item.cost) budget += item.cost;
    }
  }
  if (budgetEl) budgetEl.textContent = budget.toLocaleString('cs-CZ') + ' Kč';
}

function createCard(item: any): HTMLElement {
  const el = document.createElement('div');
  el.className = `kanban-item`;

  let linkHtml = '';
  if (item.link) {
    const isUrl = item.link.startsWith('http');
    linkHtml = isUrl
      ? `<a href="${item.link}" target="_blank" class="card-link" style="color:var(--color-primary);font-size:.85em"><i class="fas fa-external-link-alt"></i> Otevřít</a>`
      : `<span style="font-size:.85em;color:#6b7280"><i class="fas fa-phone"></i> ${item.link}</span>`;
  }

  let costHtml = '';
  if (item.category === 'task' && item.cost) {
    costHtml = `<div style="font-weight:600;color:var(--color-primary);margin-top:4px">${item.cost.toLocaleString('cs-CZ')} Kč</div>`;
  }

  let votesHtml = '';
  if (item.category === 'idea') {
    const myId = getUserId();
    const hasVoted = item.votes?.includes(myId);
    votesHtml = `<button class="vote-btn ${hasVoted ? 'voted-up' : ''}" data-vote="${item.id}"><i class="fas fa-heart"></i> ${item.votes?.length || 0}</button>`;
  }

  let statusHtml = '';
  if (item.category === 'task') {
    const map: Record<string, string> = { pending: 'Čeká se', approved: 'Schváleno', done: 'Hotovo' };
    statusHtml = `
      <select class="status-select" data-status-id="${item.id}">
        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Čeká se</option>
        <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>Schváleno</option>
        <option value="done" ${item.status === 'done' ? 'selected' : ''}>Hotovo</option>
      </select>`;
  }

  el.innerHTML = `
    <div class="kanban-item-title" style="display:flex;justify-content:space-between;align-items:start">
      <span>${item.title}</span>
      <button class="delete-card-btn" data-del="${item.id}" style="background:none;border:none;color:#9ca3af;cursor:pointer" title="Smazat"><i class="fas fa-trash"></i></button>
    </div>
    <div class="kanban-item-desc">${(item.description || '').replace(/\n/g, '<br>')}</div>
    ${linkHtml}${costHtml}
    <div class="kanban-item-footer">
      <span class="kanban-item-author"><i class="fas fa-user"></i> ${item.createdBy}</span>
      ${votesHtml}${statusHtml}
    </div>`;
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

  // Category change → toggle cost field
  $<HTMLSelectElement>('rec-category')?.addEventListener('change', (e) => {
    const cg = $('cost-group');
    if (cg) cg.classList.toggle('hidden', (e.target as HTMLSelectElement).value !== 'task');
  });

  // Form submit
  $<HTMLFormElement>('add-reconstruction-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      category: $<HTMLSelectElement>('rec-category')!.value,
      title: $<HTMLInputElement>('rec-title')!.value,
      description: $<HTMLTextAreaElement>('rec-desc')?.value || '',
      link: $<HTMLInputElement>('rec-link')?.value || '',
      cost: $<HTMLInputElement>('rec-cost')?.value || '',
    };
    const r = await authFetch('/api/reconstruction', { method: 'POST', body: JSON.stringify(data) });
    if (r) {
      hide($('add-reconstruction-modal'));
      $<HTMLFormElement>('add-reconstruction-form')?.reset();
      loadItems();
    }
  });

  // Event delegation for cards (vote, delete, status)
  container.addEventListener('click', async (e) => {
    const voteBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-vote]');
    if (voteBtn) {
      await authFetch(`/api/reconstruction/${voteBtn.dataset.vote}/vote`, { method: 'PATCH' });
      loadItems();
      return;
    }
    const delBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-del]');
    if (delBtn) {
      if (!confirm('Smazat?')) return;
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

/* ============================================================================
   lib/custom-select.ts — Vanilla TS utility: replaces native <select> with
   a fully styleable custom dropdown.
   Usage:
     import { initCustomSelects } from '../lib/custom-select';
     initCustomSelects(container);        // upgrades all <select> in container
     destroyCustomSelects(container);     // restores original selects on unmount
   ============================================================================ */

import '../styles/custom-select.css';

interface CustomSelectState {
    wrapper: HTMLElement;
    originalSelect: HTMLSelectElement;
    trigger: HTMLElement;
    optionsList: HTMLElement;
    cleanup: () => void;
}

const registry = new WeakMap<HTMLSelectElement, CustomSelectState>();

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Upgrades every visible `<select>` inside `container` to a custom dropdown.
 * Skips selects that already have been upgraded.
 */
export function initCustomSelects(container: HTMLElement): void {
    container.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
        if (registry.has(sel)) return;       // already upgraded
        if (sel.closest('.custom-select-wrapper')) return; // nested — skip
        buildCustomSelect(sel);
    });

    // Close all open dropdowns when clicking outside
    if (!(window as any).__csGlobalHandler) {
        (window as any).__csGlobalHandler = true;
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.custom-select-wrapper.open').forEach((w) => {
                if (!w.contains(e.target as Node)) w.classList.remove('open');
            });
        });
    }
}

/**
 * Destroys all custom selects inside `container`, restoring originals.
 */
export function destroyCustomSelects(container: HTMLElement): void {
    container.querySelectorAll<HTMLSelectElement>('select').forEach((sel) => {
        const state = registry.get(sel);
        if (!state) return;
        state.cleanup();
        registry.delete(sel);
    });
}

// ─── Internal builder ──────────────────────────────────────────────────────────

function buildCustomSelect(sel: HTMLSelectElement): void {
    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    // Trigger button
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');

    // Options list
    const optionsList = document.createElement('ul');
    optionsList.className = 'custom-select-options';
    optionsList.setAttribute('role', 'listbox');

    // Populate
    function renderOptions(): void {
        optionsList.innerHTML = '';
        Array.from(sel.options).forEach((opt, idx) => {
            const li = document.createElement('li');
            li.className = 'custom-select-option';
            li.setAttribute('role', 'option');
            li.dataset.value = opt.value;
            li.textContent = opt.textContent || opt.value;
            if (idx === sel.selectedIndex) li.classList.add('selected');

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                updateTriggerText();
                wrapper.classList.remove('open');
                // Update selected class
                optionsList.querySelectorAll('.custom-select-option').forEach((o) =>
                    o.classList.remove('selected')
                );
                li.classList.add('selected');
            });

            optionsList.appendChild(li);
        });
    }

    function updateTriggerText(): void {
        const selected = sel.options[sel.selectedIndex];
        trigger.innerHTML = `
      <span>${selected?.textContent || ''}</span>
      <span class="cs-arrow">▼</span>
    `;
    }

    renderOptions();
    updateTriggerText();

    // Toggle open/close
    const onTriggerClick = (e: Event) => {
        e.stopPropagation();
        // Close other selects first
        document.querySelectorAll('.custom-select-wrapper.open').forEach((w) => {
            if (w !== wrapper) w.classList.remove('open');
        });
        wrapper.classList.toggle('open');
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            wrapper.classList.toggle('open');
        } else if (e.key === 'Escape') {
            wrapper.classList.remove('open');
        }
    };

    trigger.addEventListener('click', onTriggerClick);
    trigger.addEventListener('keydown', onKeyDown);

    // Observe changes to <select> programmatically
    const observer = new MutationObserver(() => {
        renderOptions();
        updateTriggerText();
    });
    observer.observe(sel, { childList: true, attributes: true, subtree: true });

    // Also handle programmatic value changes via 'change' event
    const onSelectChange = () => {
        renderOptions();
        updateTriggerText();
    };
    sel.addEventListener('change', onSelectChange);

    // Insert into DOM: hide original, insert wrapper
    sel.style.display = 'none';
    sel.parentNode!.insertBefore(wrapper, sel);
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsList);
    // Keep original select inside wrapper so form submission still works
    wrapper.appendChild(sel);

    // Cleanup function
    const cleanup = () => {
        observer.disconnect();
        sel.removeEventListener('change', onSelectChange);
        trigger.removeEventListener('click', onTriggerClick);
        trigger.removeEventListener('keydown', onKeyDown);
        sel.style.display = '';
        wrapper.parentNode?.insertBefore(sel, wrapper);
        wrapper.remove();
    };

    registry.set(sel, { wrapper, originalSelect: sel, trigger, optionsList, cleanup });
}

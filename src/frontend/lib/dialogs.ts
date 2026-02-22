/* ============================================================================
   lib/dialogs.ts — Custom Modal Dialogs (Alert, Confirm, Prompt)
   ============================================================================ */

export interface DialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  inputType?: 'text' | 'password' | 'email' | 'number';
  inputValue?: string;
  inputPlaceholder?: string;
}

/**
 * Internal helper to create and manage the dialog DOM.
 */
function createDialogDOM(
  options: DialogOptions,
  type: 'alert' | 'confirm' | 'prompt'
): {
  overlay: HTMLDivElement;
  form: HTMLFormElement;
  input: HTMLInputElement | null;
  close: () => void;
} {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  
  // Create dialog box
  const dialogBox = document.createElement('div');
  dialogBox.className = 'dialog-box';
  
  // Header
  const header = document.createElement('div');
  header.className = 'dialog-header';
  const titleEl = document.createElement('h3');
  titleEl.textContent = options.title;
  header.appendChild(titleEl);
  
  // Body
  const body = document.createElement('div');
  body.className = 'dialog-body';
  
  if (options.message) {
    const msgEl = document.createElement('p');
    msgEl.textContent = options.message;
    body.appendChild(msgEl);
  }
  
  // Form (to handle Enter key submission)
  const form = document.createElement('form');
  form.className = 'dialog-form';
  
  let input: HTMLInputElement | null = null;
  if (type === 'prompt') {
    input = document.createElement('input');
    input.type = options.inputType || 'text';
    input.className = 'dialog-input';
    if (options.inputValue) input.value = options.inputValue;
    if (options.inputPlaceholder) input.placeholder = options.inputPlaceholder;
    input.required = true;
    body.appendChild(input);
  }
  
  // Footer (Buttons)
  const footer = document.createElement('div');
  footer.className = 'dialog-footer';
  
  if (type !== 'alert') {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'button-secondary dialog-cancel-btn';
    cancelBtn.textContent = options.cancelText || 'Zrušit';
    footer.appendChild(cancelBtn);
  }
  
  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'submit';
  confirmBtn.className = `button-primary dialog-confirm-btn ${options.isDestructive ? 'destructive' : ''}`;
  confirmBtn.textContent = options.confirmText || 'OK';
  footer.appendChild(confirmBtn);
  
  // Assemble
  form.appendChild(body);
  form.appendChild(footer);
  dialogBox.appendChild(header);
  dialogBox.appendChild(form);
  overlay.appendChild(dialogBox);
  
  document.body.appendChild(overlay);
  
  // Trigger reflow for animation
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
  });
  
  const close = () => {
    overlay.classList.remove('visible');
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 200); // Match CSS transition duration
  };
  
  return { overlay, form, input, close };
}

/**
 * Zobrazí informační dialog (náhrada za window.alert).
 */
export function showAlert(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => {
    const { overlay, form, close } = createDialogDOM({ title, message }, 'alert');
    
    const handleClose = () => {
      close();
      resolve();
    };
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleClose();
    });
    
    // Focus confirm button
    const confirmBtn = form.querySelector('.dialog-confirm-btn') as HTMLButtonElement;
    confirmBtn?.focus();
    
    // Escape to close
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('keydown', onKeyDown);
        handleClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
  });
}

/**
 * Zobrazí potvrzovací dialog (náhrada za window.confirm).
 */
export function showConfirm(
  title: string,
  message?: string,
  isDestructive = false,
  confirmText = 'Potvrdit',
  cancelText = 'Zrušit'
): Promise<boolean> {
  return new Promise((resolve) => {
    const { overlay, form, close } = createDialogDOM(
      { title, message, isDestructive, confirmText, cancelText },
      'confirm'
    );
    
    const handleResolve = (result: boolean) => {
      close();
      resolve(result);
    };
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleResolve(true);
    });
    
    const cancelBtn = form.querySelector('.dialog-cancel-btn') as HTMLButtonElement;
    cancelBtn?.addEventListener('click', () => handleResolve(false));
    
    // Focus confirm button
    const confirmBtn = form.querySelector('.dialog-confirm-btn') as HTMLButtonElement;
    confirmBtn?.focus();
    
    // Escape to cancel
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('keydown', onKeyDown);
        handleResolve(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
  });
}

/**
 * Zobrazí dialog pro zadání textu (náhrada za window.prompt).
 */
export function showPrompt(
  title: string,
  message?: string,
  defaultValue = '',
  inputPlaceholder = '',
  confirmText = 'Potvrdit',
  cancelText = 'Zrušit'
): Promise<string | null> {
  return new Promise((resolve) => {
    const { overlay, form, input, close } = createDialogDOM(
      { title, message, inputValue: defaultValue, inputPlaceholder, confirmText, cancelText },
      'prompt'
    );
    
    const handleResolve = (result: string | null) => {
      close();
      resolve(result);
    };
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleResolve(input?.value || '');
    });
    
    const cancelBtn = form.querySelector('.dialog-cancel-btn') as HTMLButtonElement;
    cancelBtn?.addEventListener('click', () => handleResolve(null));
    
    // Focus input
    if (input) {
      input.focus();
      input.select();
    }
    
    // Escape to cancel
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('keydown', onKeyDown);
        handleResolve(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
  });
}

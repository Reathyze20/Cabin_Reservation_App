/* ============================================================================
   pages/verify.ts — Email verification via token link (#/verify?token=XYZ)
   Works outside the main app shell (user is not logged in).
   ============================================================================ */

import { showToast } from '../lib/common';

/**
 * Check if the current URL hash is a verification link.
 * Call this from main.ts init() BEFORE showing login/app.
 * Returns true if verification page was shown (caller should skip normal flow).
 */
export function isVerifyRoute(): boolean {
  const hash = window.location.hash; // e.g. "#/verify?token=abc123"
  return hash.startsWith('#/verify');
}

/**
 * Render the verification page into the given container and execute the verification.
 */
export async function mountVerifyPage(container: HTMLElement): Promise<void> {
  // Extract token from hash
  const hash = window.location.hash;
  const queryPart = hash.split('?')[1] || '';
  const params = new URLSearchParams(queryPart);
  const token = params.get('token');

  container.innerHTML = getTemplate();

  const spinner = container.querySelector('#verify-spinner') as HTMLElement;
  const result = container.querySelector('#verify-result') as HTMLElement;
  const icon = container.querySelector('#verify-icon') as HTMLElement;
  const title = container.querySelector('#verify-title') as HTMLElement;
  const message = container.querySelector('#verify-message') as HTMLElement;

  if (!token) {
    spinner.classList.add('hidden');
    result.classList.remove('hidden');
    icon.textContent = '!';
    icon.style.color = '#f59e0b';
    title.textContent = 'Chybí ověřovací token';
    message.textContent = 'Odkaz je neplatný nebo nekompletní. Zkuste se zaregistrovat znovu.';
    return;
  }

  try {
    const res = await fetch(`/api/verify-token?token=${encodeURIComponent(token)}`);
    const data = await res.json();

    spinner.classList.add('hidden');
    result.classList.remove('hidden');

    if (res.ok) {
      icon.textContent = '✓';
      icon.style.color = '#10b981';
      title.textContent = 'Účet aktivován!';
      message.textContent = data.message || 'Váš účet byl úspěšně ověřen. Nyní se můžete přihlásit.';
      showToast('Účet úspěšně aktivován!', 'success');

      // Bind back to login button
      const backBtn = container.querySelector('#verify-back-to-login');
      if (backBtn) {
        backBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.hash = '#';
          window.location.reload();
        });
      }

      // Auto-redirect to login after 4 seconds
      setTimeout(() => {
        window.location.hash = '#';
        window.location.reload();
      }, 4000);
    } else {
      icon.textContent = '✗';
      icon.style.color = '#ef4444';
      title.textContent = 'Ověření selhalo';
      message.textContent = data.message || 'Neplatný nebo expirovaný odkaz.';
      showToast(data.message || 'Ověření selhalo', 'error');
    }
  } catch {
    spinner.classList.add('hidden');
    result.classList.remove('hidden');
    icon.textContent = '✗';
    icon.style.color = '#ef4444';
    title.textContent = 'Chyba sítě';
    message.textContent = 'Nepodařilo se spojit se serverem. Zkuste to prosím později.';
    showToast('Chyba sítě při ověřování', 'error');
  }
}

function getTemplate(): string {
  return `
  <div class="verify-page" style="display:flex;align-items:center;justify-content:center;min-height:80vh;padding:24px;">
    <div style="max-width:480px;width:100%;text-align:center;padding:40px 32px;
                background:var(--color-bg-card, #1e1e2e);border-radius:16px;
                box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      
      <div id="verify-spinner" style="margin-bottom:24px;">
        <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.1);
                    border-top-color:var(--color-primary, #d97706);border-radius:50%;
                    animation:spin 0.8s linear infinite;margin:0 auto;"></div>
        <p style="color:var(--color-text-light, #9ca3af);margin-top:16px;font-size:15px;">
          Ověřuji váš účet…
        </p>
      </div>

      <div id="verify-result" class="hidden">
        <div id="verify-icon" style="font-size:48px;margin-bottom:16px;"></div>
        <h2 id="verify-title" style="margin:0 0 12px;color:var(--color-text, #e5e7eb);"></h2>
        <p id="verify-message" style="color:var(--color-text-light, #9ca3af);margin:0 0 24px;line-height:1.6;"></p>
        <a href="#" id="verify-back-to-login" class="btn btn-primary" 
           style="display:inline-block;padding:12px 32px;text-decoration:none;
                  border-radius:8px;background:var(--color-primary, #d97706);
                  color:#fff;font-weight:600;font-size:15px;
                  transition:opacity 0.2s;cursor:pointer;">
          <i class="fas fa-sign-in-alt"></i> Přejít na přihlášení
        </a>
      </div>
    </div>
  </div>

  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>`;
}

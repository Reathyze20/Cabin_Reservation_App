/* ============================================================================
   lib/submitGuard.ts — Anti Double-Submit utility

   Blokuje tlačítko po kliknutí, ukáže loading stav a znovu aktivuje
   po dokončení async operace (i při chybě).

   Použití:
     import { withSubmitGuard } from '../lib/submitGuard';

     btn.addEventListener('click', () =>
       withSubmitGuard(btn, async () => {
         await authFetch('/api/...', { ... });
       })
     );

   Nebo jako decorator formu:
     guardForm(form, submitBtn, async () => { ... });
   ============================================================================ */

// ─── withSubmitGuard ─────────────────────────────────────────────────────────

/**
 * Disabluje tlačítko, volitelně ukáže loading text, zavolá async fn,
 * pak vždy (i při chybě) tlačítko znovu aktivuje.
 */
export async function withSubmitGuard<T>(
  btn: HTMLButtonElement,
  fn: () => Promise<T>,
  loadingText?: string,
): Promise<T | undefined> {
  if (btn.disabled) return undefined; // prevence double-click

  const originalText = btn.textContent ?? '';
  const originalHtml = btn.innerHTML;

  btn.disabled = true;

  if (loadingText !== undefined) {
    btn.textContent = loadingText;
  } else {
    // Přidej subtle loading dots
    btn.innerHTML = `${originalHtml}<span class="btn-loading-dots"><span></span><span></span><span></span></span>`;
  }

  try {
    const result = await fn();
    return result;
  } catch (err) {
    throw err;
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ─── guardForm ───────────────────────────────────────────────────────────────

/**
 * Přidá submit listener na formulář s automatickou ochranou tlačítka.
 * Vrací cleanup funkci pro unmount().
 */
export function guardForm(
  form: HTMLFormElement,
  submitBtn: HTMLButtonElement,
  fn: (e: SubmitEvent) => Promise<void>,
  loadingText?: string,
): () => void {
  const handler = (e: SubmitEvent) => {
    e.preventDefault();
    withSubmitGuard(submitBtn, () => fn(e), loadingText);
  };
  form.addEventListener('submit', handler);
  return () => form.removeEventListener('submit', handler);
}

// ─── guardButton ─────────────────────────────────────────────────────────────

/**
 * Přidá click listener na tlačítko s automatickou ochranou.
 * Vrací cleanup funkci pro unmount().
 */
export function guardButton(
  btn: HTMLButtonElement,
  fn: () => Promise<void>,
  loadingText?: string,
): () => void {
  const handler = () => withSubmitGuard(btn, fn, loadingText);
  btn.addEventListener('click', handler);
  return () => btn.removeEventListener('click', handler);
}

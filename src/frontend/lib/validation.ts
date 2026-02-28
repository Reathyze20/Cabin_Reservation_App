/* ============================================================================
   lib/validation.ts — Unified Form Validation Utility

   Nahrazuje nativní HTML5 bubliny vlastní, sjednocenou UI validací.
   Čte pravidla ze standardních HTML atributů (required, minlength, type…)
   — žádná duplicitní konfigurace.

   Použití:
     import { setupFormValidation, setFieldError } from '../lib/validation';

     const cleanup = setupFormValidation(form, async (formData) => {
       await authFetch('/api/...', { method: 'POST', body: JSON.stringify(...) });
     });

     // V unmount():
     cleanup();
   ============================================================================ */

// ─── Konstanty ──────────────────────────────────────────────────────────────

const INVALID_CLASS = "is-invalid";
const ERROR_MSG_CLASS = "field-error-msg";
const CUSTOM_MSG_ATTR = "data-error-message";

// ─── Typy ────────────────────────────────────────────────────────────────────

export type ValidatableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export interface ValidationOptions {
  /** Odebere error při psaní (default: true) */
  clearOnInput?: boolean;
  /** Přidá shake animaci na formulář (default: true) */
  shakeOnError?: boolean;
  /** Scrolluje na první chybný input (default: true) */
  scrollToError?: boolean;
  /** Přepis výchozích zpráv */
  messages?: Partial<ValidationMessages>;
}

export interface ValidationMessages {
  valueMissing: string;
  typeMismatch: string;
  tooShort: string;
  tooLong: string;
  patternMismatch: string;
  rangeUnderflow: string;
  rangeOverflow: string;
  stepMismatch: string;
  badInput: string;
  generic: string;
}

// ─── Výchozí české zprávy ─────────────────────────────────────────────────────

const DEFAULT_MESSAGES: ValidationMessages = {
  valueMissing: "Toto pole je povinné.",
  typeMismatch: "Zadejte platnou hodnotu.",
  tooShort: "Hodnota je příliš krátká.",
  tooLong: "Hodnota je příliš dlouhá.",
  patternMismatch: "Hodnota nemá správný formát.",
  rangeUnderflow: "Hodnota je příliš malá.",
  rangeOverflow: "Hodnota je příliš velká.",
  stepMismatch: "Neplatný krok hodnoty.",
  badInput: "Neplatný vstup.",
  generic: "Toto pole není vyplněno správně.",
};

// ─── Interní pomocné funkce ───────────────────────────────────────────────────

function getErrorMessage(input: ValidatableElement, messages: ValidationMessages): string {
  const customMsg = input.getAttribute(CUSTOM_MSG_ATTR);
  if (customMsg) return customMsg;

  const v = input.validity;
  if (v.valueMissing) return messages.valueMissing;
  if (v.typeMismatch) return messages.typeMismatch;
  if (v.tooShort) return messages.tooShort;
  if (v.tooLong) return messages.tooLong;
  if (v.patternMismatch) return messages.patternMismatch;
  if (v.rangeUnderflow) return messages.rangeUnderflow;
  if (v.rangeOverflow) return messages.rangeOverflow;
  if (v.stepMismatch) return messages.stepMismatch;
  if (v.badInput) return messages.badInput;
  return messages.generic;
}

function showFieldError(input: ValidatableElement, message: string): void {
  input.classList.add(INVALID_CLASS);
  input.setAttribute("aria-invalid", "true");

  const parent = input.closest(".form-group") ?? input.parentElement;
  if (!parent) return;

  let errorEl = parent.querySelector<HTMLElement>(`.${ERROR_MSG_CLASS}`);
  if (!errorEl) {
    errorEl = document.createElement("span");
    errorEl.className = ERROR_MSG_CLASS;
    errorEl.setAttribute("role", "alert");
    errorEl.setAttribute("aria-live", "polite");
    // Vloží se hned za input (nebo za eye-wrapper obálku)
    const insertAfter = input.closest(".input-eye-wrapper") ?? input;
    insertAfter.insertAdjacentElement("afterend", errorEl);
  }

  errorEl.textContent = message;
  errorEl.style.display = "flex";
}

// ─── Veřejné API ─────────────────────────────────────────────────────────────

/**
 * Odstraní chybový stav z jednoho inputu.
 */
export function clearFieldError(input: ValidatableElement): void {
  input.classList.remove(INVALID_CLASS);
  input.removeAttribute("aria-invalid");

  const parent = input.closest(".form-group") ?? input.parentElement;
  if (!parent) return;

  const errorEl = parent.querySelector<HTMLElement>(`.${ERROR_MSG_CLASS}`);
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }
}

/**
 * Odstraní všechny chybové stavy ve formuláři.
 */
export function clearAllErrors(form: HTMLFormElement): void {
  (Array.from(form.elements) as ValidatableElement[]).forEach((el) => {
    if ("validity" in el) clearFieldError(el);
  });
}

/**
 * Programaticky zobrazí chybu na konkrétním inputu.
 * Vhodné pro serverové chyby (např. "Uživatelské jméno je obsazeno").
 *
 * @example
 * if (!result) setFieldError(usernameInput, 'Toto jméno je již obsazeno.');
 */
export function setFieldError(input: ValidatableElement, message: string): void {
  showFieldError(input, message);
}

/**
 * Nastaví sjednocenou validaci na formulář.
 *
 * @param form      HTMLFormElement, na který se validace aplikuje
 * @param onSubmit  Callback volaný POUZE když je formulář validní
 * @param options   Volitelné nastavení
 * @returns         Cleanup funkce — volat v `unmount()`
 */
export function setupFormValidation(form: HTMLFormElement, onSubmit: (formData: FormData) => void | Promise<void>, options: ValidationOptions = {}): () => void {
  const { clearOnInput = true, shakeOnError = true, scrollToError = true, messages: customMessages = {} } = options;

  const messages: ValidationMessages = { ...DEFAULT_MESSAGES, ...customMessages };

  // a) Vypnout nativní HTML5 bubliny
  form.setAttribute("novalidate", "true");

  // b) Submit handler
  const handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();

    const elements = Array.from(form.elements) as ValidatableElement[];
    const validatable = elements.filter((el): el is ValidatableElement => "validity" in el && !el.disabled && !["submit", "reset", "button", "hidden"].includes((el as HTMLInputElement).type));

    // c) Celková validita
    const isValid = form.checkValidity();

    if (!isValid) {
      // d) Vyznač chybné elementy
      let firstInvalid: ValidatableElement | null = null;
      validatable.forEach((input) => {
        if (!input.validity.valid) {
          showFieldError(input, getErrorMessage(input, messages));
          if (!firstInvalid) firstInvalid = input;
        }
      });

      if (shakeOnError) {
        form.classList.add("form-shake");
        form.addEventListener("animationend", () => form.classList.remove("form-shake"), { once: true });
      }

      if (scrollToError && firstInvalid) {
        (firstInvalid as ValidatableElement).scrollIntoView({ behavior: "smooth", block: "center" });
        (firstInvalid as ValidatableElement).focus({ preventScroll: true });
      }

      return;
    }

    // e) Formulář je validní
    clearAllErrors(form);
    await onSubmit(new FormData(form));
  };

  form.addEventListener("submit", handleSubmit);

  // f) Okamžitá zpětná vazba — mazání erroru při psaní
  const inputHandlers = new Map<Element, EventListener>();

  if (clearOnInput) {
    (Array.from(form.elements) as ValidatableElement[]).forEach((input) => {
      if (!("validity" in input) || (input as HTMLInputElement).type === "hidden") return;

      const handler: EventListener = () => {
        if (input.classList.contains(INVALID_CLASS)) clearFieldError(input);
      };

      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
      inputHandlers.set(input, handler);
    });
  }

  // Cleanup funkce pro unmount()
  return (): void => {
    form.removeEventListener("submit", handleSubmit);
    form.removeAttribute("novalidate");
    inputHandlers.forEach((handler, input) => {
      input.removeEventListener("input", handler);
      input.removeEventListener("change", handler);
    });
    inputHandlers.clear();
  };
}

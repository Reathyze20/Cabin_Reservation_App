/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "flatpickr/dist/l10n/cs.js" {
  import { CustomLocale } from "flatpickr/dist/types/locale";
  export const Czech: CustomLocale;
  const cs: Record<string, CustomLocale>;
  export default cs;
}

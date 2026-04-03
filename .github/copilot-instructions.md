# KDY NA CHATU - Frontend Rules
- **Stack:** React 18, Vite, TypeScript (strict), Tailwind CSS, shadcn/ui.
- **State & Data:** Always use TanStack (React) Query for data fetching and mutations. Use optimistic updates for UX. Axios is the client.
- **Styling constraints:** Do not use `gap` or `margin` that touch screen edges. Use `rounded-2xl` and `bg-white/95 shadow-xl` for main windows over the app background. Avoid aggressive, dark blocks unless specified.
- **Forms:** Prefer functional forms with standard `onSubmit` prevented defaults. Validate incoming payloads with Zod where necessary.
- **No external CSS:** We rely heavily on legacy CSS modules (`.css`) from Vanilla for exact layout mapping. Append to Tailwind ONLY for structural outer-wraps. DO NOT break `id=` or `.class-names`.
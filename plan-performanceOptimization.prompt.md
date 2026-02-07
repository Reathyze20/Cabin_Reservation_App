# Plan: Kompletní optimalizace výkonu aplikace

Aplikace trpí kritickými bottlenecky: žádná komprese, žádné cache headers, full-page reload místo SPA, monolitický CSS (4 597 řádků), base64 upload fotek, sekvenční API volání a duplicitní kód napříč 6 JS soubory. Cílem je maximální rychlost z pohledu uživatele.

## Steps

1. **Přidat `compression` middleware a cache headers na server** — nainstalovat `compression` a `@types/compression`, přidat `app.use(compression())` do server.new.ts před static middleware, nastavit `maxAge: '7d'` pro `express.static` na frontend i uploads cesty; snížit body parser limit z 50MB na 10MB; odhadovaný dopad: **~70 % redukce trafficu** na textových souborech

2. **Sjednotit Font Awesome na jednu verzi napříč všemi HTML** — index.html používá FA 6.5.1, ale gallery.html, diary.html, notes.html, reconstruction.html používají FA 6.4.2; sjednotit na 6.5.1 všude; přidat `<link rel="preconnect">` pro cdnjs.cloudflare.com a fonts.googleapis.com na všech stránkách; stáhnout favicon lokálně místo z flaticon CDN

3. **Přejít na `multipart/form-data` upload fotek místo base64** — nainstalovat `multer` a `sharp`; nahradit base64 endpoint v gallery.ts za multer upload; přidat serverový resize (thumbnail 400px + full 1920px max) přes sharp; aktualizovat gallery.js na FormData upload; paralelizovat upload více fotek přes `Promise.all` místo sekvenčního `for...of`

4. **Paralelizovat API volání na frontendu a přidat data cache** — v script.js funkci `showApp()` spustit `fetchUsers`, `loadReservations`, `loadShoppingList` paralelně přes `Promise.all` místo sekvenčního await; přidat jednoduchý `sessionStorage` cache wrapper s TTL pro API odpovědi; opravit diary.js kde `loadGalleryPhotos()` stahuje VŠECHNY fotky z galerie místo jen potřebných (přidat `?ids=` query parametr na backend)

5. **Optimalizovat bulk operace na serveru** — v gallery.ts bulk delete nahradit sekvenční `for...of` smyčku jedním `prisma.galleryPhoto.deleteMany()`; v diary.js nahradit DELETE + CREATE pattern za PUT endpoint pro editaci zápisu; v shoppingList.ts konsolidovat duplikované purchase a delete endpointy

6. **Extrahovat sdílený kód do common modulu** — vytvořit `src/frontend/common.js` se sdílenými funkcemi: auth check + redirect, `authFetch()` wrapper, `showToast()`, logout handler, modal close handler, `hexToRgba()`; importovat přes `<script>` tag na všech stránkách; eliminuje ~200 řádků duplicitního kódu

7. **Přidat Vite jako bundler s minifikací a code splitting** — inicializovat Vite pro frontend build; nakonfigurovat multi-page mode pro všech 6 HTML stránek; přidat CSS a JS minifikaci; generovat hashed filenames pro long-term caching; rozdělit monolitický style.css (4 597 řádků) na base.css + per-page CSS moduly; aktualizovat build script v package.json

8. **Přidat lazy loading a image optimalizace na frontend** — přidat `loading="lazy"` na fotky v diary.js (galerie už ho má); implementovat `IntersectionObserver` pro lazy load fotek v galerii místo renderování všech najednou; servírovat thumbnaily v grid view, plné fotky jen v lightboxu

9. **Přechod na SPA s client-side routerem** — implementovat jednoduchý hash-based router; sloučit všech 6 HTML stránek do jedné s dynamickým content loadingem; eliminuje full page reload (~400-500 KB bez cache) při každé navigaci; zachovat browser history a deep linking; přidat skeleton loaders pro loading states

10. **Přidat Service Worker pro offline cache a prefetch** — vytvořit service worker s cache-first strategií pro statické assety (CSS, JS, fonty, favicony); network-first pro API data; přidat prefetch pro pravděpodobné next-page navigace; umožní základní offline fungování (zobrazení cached dat)

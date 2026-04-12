# Custom Icon Set — Midjourney Prompts for kdynachatu.cz

## About This App

**kdynachatu.cz** is a Czech cabin management SaaS app for families sharing vacation cottages. The UI uses frosted glass cards on a forest/mountain wallpaper background. Colors: sage green primary, warm wood accents, white surfaces. The app already uses **Lucide React** for generic UI icons (navigation, actions, weather, chevrons, checkmarks, etc.). We only need Midjourney for **cabin-lifestyle themed icons** that Lucide doesn't have.

## What We Need (19 custom icons total)

### Category A: Activity Tags (6 icons, displayed at 16×16px)
Used in diary entries — each entry is tagged with an activity type. Currently showing `○` placeholder.
1. **Relaxation** — hammock, hot drink, peaceful vibes
2. **Party/social** — campfire with drinks, celebration
3. **Work/maintenance** — chopping wood, tools, manual labor
4. **Mushroom picking** — single mushroom, foraging
5. **Hiking** — boot print on trail, walking stick
6. **Family gathering** — group of people under cabin roof

### Category B: Reconstruction Categories (3 icons, displayed at 16×16px)
Used in a kanban board for cabin renovation projects. Currently showing `•` placeholder.
1. **Idea/suggestion** — lightbulb with organic/nature twist
2. **Contractor/company** — small building or storefront
3. **Task/to-do** — checkbox with checkmark

### Category C: Empty State Illustrations (3 illustrations, displayed at 64–96px)
Shown when a page has no data. Warm, inviting, slightly melancholic feel. Currently showing `—` dash.
1. **Empty list** — empty woven basket (for shopping lists, pantry, inventory)
2. **Empty folder/gallery** — empty wooden picture frame (for photo gallery, diary)
3. **Generic empty** — bare wooden shelf with cobweb (for dashboard, settings, reconstruction)

### Category D: Error State Illustrations (2 illustrations, displayed at 64–96px)
Shown when a component crashes. Should convey "something went wrong" without alarming. Currently showing `—` dash.
1. **Widget error** (smaller, in a card) — cracked log with moss
2. **Page error** (full page) — overgrown trail disappearing into mist

### Category E: Section Decorative Icons (4 icons, displayed at 24–32px)
Used as decorative headers for special sections. Currently showing `—` or `*` placeholders.
1. **Cabin checklist** — clipboard with key (for departure checklist section)
2. **Winterize** — snowflake merged with cabin silhouette (for winter preparation banner)
3. **Modules/features** — puzzle piece with leaf vein (for feature toggles section)
4. **Founder** — person silhouette with mountain backdrop (for about/founder section on landing page)

---

## How to Use

1. Start with **Style Anchor** prompt — this establishes the visual style
2. After Style Anchor generates, right-click the best result and copy the image URL
3. For every subsequent prompt, manually add `--sref <paste_url_here>` at the end before the `--no` parameters
4. Pick the best result from each generation, upscale it (U1-U4)
5. Crop each individual icon from the sheet
6. Vectorize via Vectorizer.ai or Adobe Illustrator Image Trace
7. Clean SVG: remove background, set `viewBox="0 0 24 24"`, replace fill/stroke colors with `currentColor`
8. Save to `frontend-v2/public/icons/`

---

## Prompt 1: Style Anchor (generate this first, do NOT add --sref)

```
icon sheet, 6 minimal line icons arranged in a 3x2 grid on pure white background, sage green single color stroke, thin consistent line weight, rounded line caps, naturalist field notebook sketch style, clean but slightly organic not perfectly geometric, subtle nature motifs, no fills except very light sage wash, cabin with chimney smoke, campfire, pine tree, mountain peaks, mushroom, hiking boot print --ar 1:1 --v 6.1 --style raw --no gradient shadow glow emoji cartoon text color background pattern fills
```

---

## Prompt 2: Activity Tags (6 icons — Category A)

These are tiny badges next to diary entries. Must be recognizable at 16px.

```
icon sheet, 6 minimal line icons arranged in a 3x2 grid on pure white background, generous spacing between icons, sage green single color stroke, thin consistent line weight, rounded caps and joins, naturalist field guide sketch style, slightly organic lines, hammock between two pine trees with steam wisps, campfire with sparks and two clinking glasses, hand axe in a log with wood grain, single boletus mushroom with small leaf, hiking boot footprint on winding forest trail, three human silhouettes under cabin roof outline, each icon same proportions, minimal detail, clean readable shapes --ar 1:1 --v 6.1 --style raw --no gradient shadow glow emoji cartoon text background faces eyes color pattern fills
```

Output: `tag-relax.svg`, `tag-party.svg`, `tag-work.svg`, `tag-mushroom.svg`, `tag-hike.svg`, `tag-family.svg`

---

## Prompt 3: Reconstruction Categories (3 icons — Category B)

Used in a kanban board header to distinguish idea vs contractor vs task. Must be readable at 16px.

```
icon sheet, 3 minimal line icons in a row on pure white background, generous spacing, sage green single color stroke, thin consistent line weight, rounded caps, naturalist field guide sketch style, light bulb with small leaf sprout growing from top, small workshop building with hammer above doorway wrench hanging on wall, checkbox with hand-drawn checkmark inside slightly imperfect organic lines, each icon same proportions, clean readable --ar 3:1 --v 6.1 --style raw --no gradient shadow glow emoji cartoon text background faces color pattern fills
```

Output: `category-idea.svg`, `category-company.svg`, `category-task.svg`

---

## Prompt 4: Empty State Illustrations (3 illustrations — Category C)

These appear centered on empty pages with text like "No items yet" below them. Larger and more detailed than typical icons. Warm, inviting, cozy cabin atmosphere.

```
icon sheet, 3 detailed line illustrations in a row on pure white background, sage green strokes with very light sage wash fills, thin consistent line weight, rounded caps, naturalist field notebook sketch style, warm inviting slightly melancholic, woven basket empty inside with dashed outline small leaf on rim, wooden picture frame empty inside with small vine tendril growing on edge, rustic wooden shelf bare with nothing on it small cobweb in corner wood grain texture, each illustration larger and more detailed than typical icons --ar 3:1 --v 6.1 --style raw --no gradient shadow glow emoji cartoon text background faces photograph color pattern fills
```

Output: `empty-list.svg`, `empty-folder.svg`, `empty-generic.svg`

---

## Prompt 5: Error State Illustrations (2 illustrations — Category D)

Shown when something crashes. Should feel natural and non-alarming — "the forest reclaimed this path" vibe rather than red warning signs.

```
icon sheet, 2 detailed line illustrations side by side on pure white background, sage green strokes with warm wood brown accent, thin consistent line weight, naturalist field notebook style, cracked wooden log split down middle with exclamation mark floating above moss on sides wood grain visible, overgrown forest trail fading into mist ferns and grass overtaking path two pine trees framing scene, evocative but clean linework --ar 2:1 --v 6.1 --style raw --no gradient shadow glow emoji cartoon text background faces photograph color pattern fills
```

Output: `error-feature.svg`, `error-page.svg`

---

## Prompt 6: Section Decorative Icons (4 icons — Category E)

Used as decorative elements next to section headers. Slightly more ornate than regular icons but still clean linework. Displayed at 24-32px.

```
icon sheet, 4 minimal line icons arranged in a 2x2 grid on pure white background, generous spacing, sage green single color stroke, thin consistent line weight, rounded caps, naturalist field guide style, clipboard with three checkmarks and vintage key hanging from clip, snowflake with small cabin roof silhouette nested inside center, jigsaw puzzle piece with leaf vein pattern etched across surface, small A-frame cabin with flag pennant on pole on roof peak, each icon same proportions, decorative but readable --ar 1:1 --v 6.1 --style raw --no gradient shadow glow emoji cartoon text background faces color pattern fills
```

Output: `section-checklist.svg`, `section-winterize.svg`, `section-modules.svg`, `section-founder.svg`

---

## Tips

- **Always** use `--style raw` — prevents MJ artistic interpretation
- **Always** add `--sref <url>` (from prompt 1 result) to prompts 2–6 for style consistency
- **`--no`** list is critical — prevents unwanted elements
- Expect 3–5 re-rolls per prompt for clean results
- If icons are too detailed or artistic, add `--s 50` to lower stylization
- If icons merge together, reduce count per sheet or add more spacing description

---

## NOT Needed from Midjourney

These are already covered by **Lucide React** in the app:
- Navigation: `Home`, `CalendarDays`, `MessageCircle`, `ShoppingCart`, `Images`, `BookOpen`, `Hammer`, `Settings`
- Actions: `Plus`, `Pencil`, `Trash2`, `X`, `Check`, `Search`, `Upload`, `Download`
- Weather: `Sun`, `Cloud`, `CloudRain`, `Thermometer`, `Wind`, etc.
- UI: `ChevronLeft`, `ChevronRight`, `Eye`, `EyeOff`, `AlertTriangle`
- Status: checkmarks (`✓`) and X marks (`✕`) use Lucide `Check` / `X`
- Drag handles (`⠿`) use Lucide `GripVertical`
- Pin indicators, reply/copy/edit actions already have inline SVGs in the codebase

---

## Implementation — Placeholder-to-Icon Mapping

After icons are generated and vectorized, save to `frontend-v2/public/icons/` and replace:

| File | Current placeholder | Replace with |
|------|--------------------|--------------|
| `features/diary/DiaryFolders.tsx` | `○` (6× in TAG_ICONS) | `tag-relax`, `tag-party`, `tag-work`, `tag-mushroom`, `tag-hike`, `tag-family` |
| `features/reconstruction/KanbanColumn.tsx` | `•` (3× categories) | `category-idea`, `category-company`, `category-task` |
| `features/dashboard/ReconstructionWidget.tsx` | `•` (CATEGORY_ICONS) | `category-idea`, `category-company`, `category-task` |
| `features/shopping/ListDetail.tsx` | `—` (empty list) | `empty-list` |
| `features/shopping/ListMaster.tsx` | `—` (no lists) | `empty-list` |
| `features/shopping/PantryView.tsx` | `—` (empty pantry) | `empty-list` |
| `features/diary/GalleryPicker.tsx` | `—` (empty folder) | `empty-folder` |
| `features/diary/DiaryPage.tsx` | `—` (empty diary) | `empty-generic` |
| `features/reconstruction/ReconstructionPage.tsx` | `—` (no items) | `empty-generic` |
| `features/settings/CabinSettingsPage.tsx` | `—` (empty) | `empty-generic` |
| `features/dashboard/DashboardPage.tsx` | `—` (empty) | `empty-generic` |
| `components/shared/FeatureErrorFallback.tsx` | `—` (widget error) | `error-feature` |
| `components/shared/GlobalFallback.tsx` | `—` (page error) | `error-page` |
| `features/dashboard/DashboardPage.tsx` | `*` (winter banner) | `section-winterize` |
| `features/landing/LandingPage.tsx` | `—` (founder) | `section-founder` |

### Recommended React import

```tsx
// As React component (preferred — supports CSS color via currentColor)
import TagRelax from '/icons/tag-relax.svg?react';
<TagRelax className="w-4 h-4 text-primary" />

// Reusable wrapper
const Icon = ({ name, size = 16 }: { name: string; size?: number }) => (
  <img src={`/icons/${name}.svg`} width={size} height={size} alt="" aria-hidden="true" />
);
```

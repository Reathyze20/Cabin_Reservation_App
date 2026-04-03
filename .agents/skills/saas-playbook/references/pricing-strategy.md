# Pricing & Monetization Strategy — kdynachatu.cz

## Analýza trhu

### Cílová skupina
- **Rodiny** vlastnící/sdílející rekreační chatu (cca 500 000 chat v ČR)
- **Skupiny přátel** sdílející chalupu
- **Spolky/sdružení** spravující klubovnu
- **Malí pronajímatelé** (1–3 objekty, nechtějí Booking.com)

### Ochota platit
- Cílová skupina je **cenově citlivá** — chatu mají jako hobby, ne business
- **Klíčový argument pro platbu:** "ušetří to hádky a zmatky v rodině"
- **Price anchor:** Netflix CZ (199–319 Kč/měs), Spotify (169 Kč/měs)
- **Sweet spot:** 79 Kč/měsíc nebo 599 Kč/rok za chatu (ne za uživatele!)
- **Sezónní hook:** Zimní sezóna (říjen–březen) zdarma při ročním plánu = efektivně platíš jen za 6 měsíců sezóny

### Konkurence
| Konkurent | Co dělá | Cena | Slabina |
|---|---|---|---|
| Google Calendar + Sheets | Rezervace + seznamy | Zdarma | Není integrované, chaotické |
| WhatsApp skupina | Komunikace | Zdarma | Zprávy se ztratí, žádná struktura |
| Booking.com / Airbnb | Komerční pronájem | Provize | Too much pro rodinnou chatu |
| Notion/Trello | Projektový management | $10+/měs | Není specifické pro chaty |
| **kdynachatu.cz** | Vše v jednom pro chatu | 79 Kč/měs nebo 599 Kč/rok | Musí být lepší než "WhatsApp + kalendář" |

---

## Doporučený Pricing Model: Freemium + Paid Tiers

### Proč Freemium (ne trial)
- **Snižuje bariéru** — "zkus zdarma" je silnější než "14 dní trial"
- **Virální šíření** — free uživatelé zvou členy, někteří upgradují
- **Product-led growth** — produkt prodává sám sebe
- **Data** — vidíš jak lidé appku používají, než je požádáš o peníze

### Tier Structure

#### 🌿 Zdarma (Free)
**Cíl:** Dostat lidi dovnitř, ukázat hodnotu, vytvořit návyk

| Feature | Limit |
|---|---|
| Počet chat | 1 |
| Počet členů | 5 |
| Rezervace | ✅ Neomezené |
| Nákupní seznamy | ✅ 1 aktivní |
| Poznámky/Nástěnka | ✅ 10 poznámek |
| Fotogalerie | ❌ |
| Deník | ❌ |
| Inventář | ❌ |
| Email notifikace | ❌ Pouze in-app |
| Údržba/Rekonstrukce | ❌ |
| Chat | ❌ |
| Podpora | Komunita/FAQ |
| Branding | "Powered by kdynachatu.cz" watermark |

#### 🏡 Chatař (79 Kč/měsíc nebo 599 Kč/rok)
**Cíl:** Core paying tier — rodina se rozhodne zaplatit
**Roční plán:** 599 Kč/rok = **49,9 Kč/měsíc** (sleva 37%) + **zimní sezóna zdarma** (říjen–březen)
**Messaging:** "Za cenu jednoho oběda měsíčně máte klid na celou sezónu"

| Feature | Limit |
|---|---|
| Počet chat | 1 |
| Počet členů | 15 |
| Rezervace | ✅ Neomezené |
| Nákupní seznamy | ✅ Neomezené |
| Poznámky/Nástěnka | ✅ Neomezené |
| Fotogalerie | ✅ 5 GB |
| Deník | ✅ |
| Inventář | ✅ |
| Email notifikace | ✅ |
| Údržba/Rekonstrukce | ✅ |
| Chat | ✅ |
| Podpora | Email |
| Branding | Bez watermarku |
| Export dat | ✅ CSV |

#### 🏔️ Správce (149 Kč/měsíc nebo 1 199 Kč/rok)
**Cíl:** Power users, pronajímatelé, spolky s více objekty
**Roční plán:** 1 199 Kč/rok = **99,9 Kč/měsíc** (sleva 33%) + zimní sezóna zdarma

| Feature | Limit |
|---|---|
| Počet chat | Až 5 |
| Počet členů | 50 per chata |
| Vše z Chataře | ✅ |
| Fotogalerie | ✅ 25 GB |
| Automatické reporty | ✅ Měsíční email |
| Custom branding | ✅ Logo, barvy |
| API přístup | ✅ |
| Prioritní podpora | ✅ |
| Export dat | ✅ CSV + PDF |

---

## Monetizační strategie

### Fáze 1: Validace (měsíce 1–3)
- **Vše zdarma** pro prvních 50–100 chat
- Sbírej feedback a usage data
- Identifikuj které features jsou nejpoužívanější (= ty budou paid)
- Buduj čekací seznam na paid features

### Fáze 2: Soft Launch Pricing (měsíce 3–6)
- Zapni Free + Chatař tier (79 Kč/měs, 599 Kč/rok)
- **Sezónní hook:** "Zimní sezóna zdarma" — kdo zaplatí roční plán, neplatí říjen–březen
  - Technicky: roční plán = 599 Kč za 12 měsíců, ale marketing říká "platíte jen za sezónu"
  - Tím motivuješ k ročnímu plánu (lepší cash flow, nižší churn)
- **Early adopter sleva:** -30% navždy pro prvních 100 platících (599 → 419 Kč/rok)
- Platební brána: **Stripe** (CZ supported, easy integrace)

### Fáze 3: Full Pricing (měsíce 6+)
- Zapni všechny tiers
- A/B test pricing (79 vs 99 Kč měsíčně)
- Přidej Správce tier až budeš mít multi-cabin zákazníky
- Zvaž sezónní akce: "Jarní příprava" (březen), "Letní sezóna" (květen) — sleva na roční

---

## Conversion Triggers (kde v appce ukazovat upgrade)

### Soft Paywalls (nejefektivnější)
| Moment | Co uživatel vidí |
|---|---|
| Snaží se přidat 6. člena | "Chcete přidat další členy? Upgradujte na Chatař." |
| Snaží se nahrát fotku | "Fotogalerie je dostupná v plánu Chatař. Vyzkoušejte 14 dní zdarma." |
| Vytvoří 2. nákupní seznam | "Neomezené nákupní seznamy v plánu Chatař." |
| Zapne notifikace | "Email notifikace jsou v plánu Chatař." |
| Zkusí otevřít Deník | Preview s blur efektem + upgrade CTA |

### Upgrade UX pravidla
- **NIKDY** neblokuj core functionality (rezervace) — to je důvod proč přišli
- **Vždy** ukaž co by feature udělala (screenshot, preview) — ne jen "locked"
- **Vždy** nabídni trial/preview (14 dní) — snížení friction
- **Nikdy** nebuď agresivní — 1 upgrade prompt per session max
- Upgrade stránka musí být **krásná** — tohle je prodejní moment

---

## Revenue Projections (konzervativní)

### Předpoklady
- 1000 registrovaných chat za rok (organický růst + SEO)
- 5% konverze free → paid = 50 platících
- Mix: 70% roční (599 Kč/rok = 49,9 Kč/měs) + 30% měsíční (79 Kč/měs)
- Průměrný **blended MRR per customer:** ~59 Kč/měs

### Year 1
- **Platící:** 50 chat
- **MRR:** 50 × 59 = ~2 950 Kč/měs
- **ARR:** ~35 000 Kč
- Pokryje: hosting (VPS ~500 Kč/měs), doména, email služba
- **Cash flow boost:** roční platby dopředu → ~21 000 Kč jednorázově při launch wave

### Year 2 (s marketingem a word-of-mouth)
- 5000 registrovaných, 8% konverze = 400 platících
- **MRR:** 400 × 65 (mix tiers, vyšší % ročních) = ~26 000 Kč/měs
- **ARR:** ~312 000 Kč
- S přidáním Správce tieru (149 Kč/měs): **potenciálně 35 000+ Kč/měs MRR**

### Year 3+ (scale-up)
- Expanze na SK, možná DE/AT (alpské chaty)
- Premium features, custom integrace
- Partnership s chatařskými komunitami
- Zvýšení cen pro nové zákazníky (99 Kč/měs, 799 Kč/rok) — stávající zůstávají na staré ceně
- **Target:** 80 000+ Kč/měs MRR

### Proč "zimní sezóna zdarma" funguje
- **Psychologie:** Zákazník cítí že dostává 12 měsíců za cenu 6 → "deal"
- **Realita:** 599 Kč/rok je tvá skutečná cena. Zimní období by stejně mělo nižší usage.
- **Churn reduction:** Roční platba = zákazník je zamčený na 12 měsíců
- **Marketing:** Sezonalita chataření přirozeně podporuje tento model
- **Upsell:** V zimě můžeš nabídnout "zimní údržbu" features (zazimování, kontrolní seznam)

---

## Technická implementace monetizace

### Co potřebuješ v kódu
1. **Subscription model v DB** — `Subscription` tabulka (tenantId, plan, status, stripeId, expiresAt)
2. **Feature flags** — `canAccessGallery()`, `canInviteMembers()`, `getMaxMembers()` — based on plan
3. **Middleware** — `checkFeatureAccess('gallery')` na backend routes
4. **Frontend gate component** — `<PaidFeature feature="gallery" fallback={<UpgradePrompt />}>`
5. **Stripe integration** — Checkout Session pro platbu, Webhook pro potvrzení
6. **Billing portal** — Stripe Customer Portal (self-service správa předplatného)

### Stripe Flow
```
User clicks "Upgrade" →
  Frontend creates Checkout Session (POST /api/billing/checkout) →
    Stripe hosted page →
      User pays →
        Stripe webhook (POST /api/webhooks/stripe) →
          Update Subscription in DB →
            User refreshes → features unlocked
```

### Feature Flag Pattern
```typescript
// Backend middleware
function requirePlan(minPlan: 'free' | 'chatar' | 'spravce') {
  return async (req, res, next) => {
    const subscription = await getSubscription(req.cabinId);
    if (planLevel(subscription.plan) < planLevel(minPlan)) {
      return res.status(403).json({ 
        message: "Tato funkce vyžaduje vyšší plán",
        requiredPlan: minPlan,
        currentPlan: subscription.plan
      });
    }
    next();
  };
}

// Frontend component  
function PaidFeature({ feature, children, fallback }) {
  const { plan } = useCabinSubscription();
  if (!hasAccess(plan, feature)) return fallback || <UpgradePrompt feature={feature} />;
  return children;
}
```

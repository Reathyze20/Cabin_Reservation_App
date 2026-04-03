# Analytics & Monitoring — kdynachatu.cz

## Přehled

Bez dat létáš naslepo. Analytics ti řeknou:
- **Co uživatelé dělají** (features, flows)
- **Kde odpadávají** (funnel leaks)
- **Co je trápí** (errory, pomalé stránky)
- **Jestli appka žije** (uptime, performance)

---

## 1. Error Tracking — Sentry (priorita #1)

### Proč Sentry
- Free tier: 5K events/měsíc (stačí na začátek)
- JavaScript + Node.js SDK
- Source maps upload → čitelné stacktrace z minified kódu
- Release tracking → víš která verze rozbila co
- User context → víš KTERÝ uživatel měl problém

### Setup checklist
- [ ] `@sentry/react` na frontendu (ErrorBoundary wrapper)
- [ ] `@sentry/node` na backendu (Express error handler)
- [ ] Source maps uploadované při deploy (Sentry Vite plugin)
- [ ] Release tag z git SHA
- [ ] User context: `Sentry.setUser({ id: userId, username })`
- [ ] Environment tag: `production` / `development`
- [ ] Performance monitoring zapnuté (tracesSampleRate: 0.1)
- [ ] Alert: email při 10+ events za hodinu

### Backend integration
```typescript
// v server.new.ts — PŘED routes
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
app.use(Sentry.Handlers.requestHandler());

// PO routes
app.use(Sentry.Handlers.errorHandler());
```

### Frontend integration  
```typescript
// v main.tsx
import * as Sentry from '@sentry/react';
Sentry.init({ 
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
});
```

---

## 2. Product Analytics — Plausible nebo PostHog

### Proč NE Google Analytics
- GDPR problém (data mimo EU)
- Overkill pro SaaS (není ecommerce)
- Blokovaný ad blockery

### Doporučení: Plausible (self-hosted nebo cloud)
- GDPR-friendly (no cookies → no consent banner!)
- Lightweight (< 1KB script)
- Self-hosted option (VPS Docker)
- Free při self-host, € 9/měs cloud

### Alternativa: PostHog (pro hlubší analytics)
- Session recordings (vidíš co uživatel dělá)
- Feature flags
- A/B testing
- Free tier: 1M events/měs
- Self-hosted Docker option

### Klíčové events k trackování

#### Onboarding funnel
```
page_view (landing page)
  → click_register_cta
    → user_registered { method: 'email' | 'google' }
      → cabin_created { hasLocation, hasWallpaper }
        → member_invited { method, count }
          → reservation_created { isFirst: true }
            → onboarding_completed { timeMinutes }
```

#### Core usage
```
reservation_created { daysAhead, duration, guestCount }
reservation_cancelled { reason, daysBeforeStart }
shopping_item_added { listId }
shopping_item_checked { listId }
note_created { hasThread }
photo_uploaded { count, totalSizeMB }
diary_entry_created { wordCount }
```

#### Engagement
```
session_start { platform: 'mobile' | 'desktop' | 'tablet' }
page_view { page, timeOnPage }
feature_used { feature: 'reservations' | 'shopping' | 'notes' | ... }
```

#### Monetization
```
upgrade_prompt_shown { feature, currentPlan }
upgrade_prompt_clicked { feature, currentPlan }
checkout_started { plan, billing: 'monthly' | 'yearly' }
checkout_completed { plan, amount }
plan_downgraded { from, to, reason }
plan_cancelled { plan, reason, usageDays }
```

---

## 3. Uptime Monitoring

### UptimeRobot (free tier)
- [ ] HTTP monitor na `https://kdynachatu.cz` (každých 5 min)
- [ ] HTTP monitor na `https://kdynachatu.cz/api/health` (každých 5 min)
- [ ] Alert přes email (a/nebo Telegram/Slack)
- [ ] Status page (veřejná, optional)

### Health check endpoint
```typescript
// GET /api/health
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // DB ping
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      uptime: process.uptime()
    });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});
```

---

## 4. Performance Monitoring

### Web Vitals (frontend)
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] TTFB (Time to First Byte) < 600ms

### Měření
```typescript
// v main.tsx
import { onCLS, onFID, onLCP } from 'web-vitals';

function reportVitals(metric) {
  // Posílej do Plausible/PostHog custom event
  analytics.track('web_vital', { 
    name: metric.name, 
    value: metric.value, 
    rating: metric.rating // 'good' | 'needs-improvement' | 'poor'
  });
}

onCLS(reportVitals);
onFID(reportVitals);
onLCP(reportVitals);
```

### Backend performance
- [ ] API response time logging (pino request logger)
- [ ] Alert na endpointy > 1s
- [ ] Database query time monitoring (Prisma logging)
- [ ] Memory usage monitoring (PM2 metrics)

---

## 5. Business Dashboard (KPIs)

### Metriky k sledování (weekly)

| Metrika | Definice | Zdroj | Cíl |
|---|---|---|---|
| **Registrace** | Nové účty / týden | Analytics | Rostoucí |
| **Activation rate** | % registrovaných co dokončí onboarding | Analytics | > 40% |
| **WAU** | Weekly Active Users | Analytics | Rostoucí |
| **DAU/WAU** | Stickiness ratio | Analytics | > 30% |
| **Churn rate** | % platících co zruší / měsíc | Stripe | < 5% |
| **MRR** | Monthly Recurring Revenue | Stripe | Rostoucí |
| **ARPU** | Average Revenue Per User | MRR / platící | > 99 Kč |
| **Error rate** | 500 errory / celkové requesty | Sentry + logs | < 0.1% |
| **Uptime** | % času kdy je appka dostupná | UptimeRobot | > 99.5% |
| **NPS** | Net Promoter Score | Feedback survey | > 50 |

### Kde sledovat
- **Jednoduše:** Google Sheet s ručním updatem každý týden (na začátek stačí)
- **Pokročile:** Grafana dashboard nad PostgreSQL + Plausible API
- **Ideálně:** PostHog dashboards (vše na jednom místě)

---

## 6. Logging Best Practices

### Backend (pino)
```typescript
// Správně (structured)
logger.info('RESERVATIONS', 'Reservation created', { 
  userId: req.user.userId, 
  cabinId, 
  reservationId: result.id,
  dateFrom, 
  dateTo 
});

// Špatně  
console.log("reservation created: " + reservationId); // ❌
logger.info('created'); // ❌ žádný kontext
```

### Co logovat
- ✅ Úspěšné business akce (created, updated, deleted)
- ✅ Auth události (login, logout, failed login)
- ✅ Error detaily (stack trace, request context)
- ✅ Performance anomálie (slow queries, timeouts)
- ❌ Citlivá data (hesla, tokeny, platební údaje)
- ❌ Bulk data (celé objekty, arrays s 100+ items)

### Log retention
- Denní logy v `data/logs/`
- PM2 log rotate: max 10MB per soubor, max 30 souborů
- Produkce: 30 dní retence

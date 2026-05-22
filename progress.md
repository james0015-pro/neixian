# NeiXian · 內線 — Progress Tracking

> 彭博風 + Finviz 篩選器混合風格的內部人交易追蹤儀表板
> React 19 + Vite + TypeScript + Tailwind v3 + Lightweight Charts + HashRouter

## Session Log

| Date | Tasks | Status |
|------|-------|--------|
| 2026-05-22 | Phase 0: Scaffold + Phase 1.1-1.4 | ✅ Complete |

## Phase 0: Scaffold ✅
- [x] Copy config files from WhaleTrace base
- [x] Update package.json (name: neixian, add lightweight-charts)
- [x] Update index.html (title, lang)
- [x] Create src/ directory structure
- [x] Create vite-env.d.ts
- [x] Create index.css (Bloomberg terminal theme)
- [x] Create types (insider.ts, institution.ts)
- [x] Create lib/utils.ts (formatting functions)
- [x] Create main.tsx + App.tsx (HashRouter)
- [x] npm install passes
- [x] npm run build passes (zero errors)

## Phase 1: Dashboard ✅
- [x] Task 1.1: DashboardPage 4-quadrant Bloomberg layout
- [x] Task 1.2: Data type definitions (insider.ts, institution.ts)
- [x] Task 1.3: InsiderTradesTable with sortable columns + filter
- [x] Task 1.4: InstitutionRanking table

## Phase 2: Data Layer
- [ ] Task 2.1: Scraper scripts (Python)
- [ ] Task 2.2: Real data samples (currently 25 mock trades + 15 holdings)

## Current State
- **Mock data**: 25 insider trades, 15 institution holdings
- **Quadrants**: Q1=Insider table, Q2=Detail panel, Q3=Institution rankings, Q4=Summary stats
- **Features**: Sortable columns, BUY/SELL filter, search, keyboard nav (1-4, ESC, /)
- **Styling**: Pure Bloomberg terminal (#000 bg, #ff8c00 amber, JetBrains Mono, inline styles)

## Next Up
- Phase 1.5: Q2 Detail panel enhancements (click row to show full detail)
- Phase 1.6: Q4 Chart (Lightweight Charts)
- Phase 2: Real data scraping

# NeiXian · 內線 — Progress Tracking

> 彭博風 + Finviz 篩選器混合風格的內部人交易追蹤儀表板
> React 19 + Vite + TypeScript + Tailwind v3 + Lightweight Charts + HashRouter
> **Live:** https://james0015-pro.github.io/neixian/

## Session Log

| Date | Tasks | Status |
|------|-------|--------|
| 2026-05-22 | Phase 0-1 + Deploy | ✅ Complete |
| 2026-05-22 | Phase 1.6: ChartPanel | ✅ Complete |
| 2026-05-22 | F009: Insider Timeline in Q2 | ✅ Complete |

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
- [x] Task 1.3: InsiderTradesTable with sortable columns + BUY/SELL filter
- [x] Task 1.4: InstitutionRanking table with sortable columns
- [x] Task 1.5: Q2 Detail panel (click insider or institution row)
- [x] Q4 Summary stats panel (total trades, buys/sells, net flow, uniques)
- [x] Keyboard navigation (1-4 switch quadrants, ESC clear, / search)
- [x] Ticker tape header animation
- [x] Search bar (ticker/insider/company)
- [x] Task 1.6: Q2 ChartPanel with Lightweight Charts (candlestick + volume, 90-day mock data)
- [x] F009: Insider history timeline in Q2 — grouped by ticker, summary stats, date range, detailed trade rows

## Deployment ✅
- [x] GitHub repo: https://github.com/james0015-pro/neixian
- [x] GitHub Pages: https://james0015-pro.github.io/neixian/
- [x] gh-pages branch with built dist
- [x] Pages source set to gh-pages branch (root)

## Phase 2: Data Layer 🚧
- [ ] Task 2.1: Python scraper scripts (SEC EDGAR + Finviz)
- [ ] Task 2.2: Real data samples (currently 25 mock trades + 15 holdings)

## Phase 4: Polish & Security ✅
- [x] F012: GitHub Pages deploy
- [x] F013: Password gate for beta (SHA-256 hash, localStorage auth, Bloomberg-style UI)

## Current State
- **Live URL**: https://james0015-pro.github.io/neixian/
- **Mock data**: 25 insider trades, 15 institution holdings
- **Quadrants**: Q1=Insider table, Q2=Detail panel, Q3=Institution rankings, Q4=Summary stats
- **Features**: Sortable columns, BUY/SELL filter, search, keyboard nav (1-4, ESC, /)
- **Styling**: Pure Bloomberg terminal (#000 bg, #ff8c00 amber, JetBrains Mono, inline styles)

## Next Up (Priority Order)
1. Phase 2.1: Python scraper for SEC EDGAR Form 4 data (F010)
2. Phase 2.2: Replace mock data with real scraped data (F011)
3. Phase 3.1: Finviz-style filter bar + additional pages
4. F013: Password gate for beta

## Session Log (additions)

| 2026-05-22 13:00 | Phase 2 Data Pipeline: Created scripts/scrape_data.py (SEC EDGAR + Finviz + OpenInsider). Ran initial data scrape. Camofox unavailable (GTK3 missing). Used Scrapling + yfinance for institution holdings (200 entries), synthetic insider trades (93 entries across 19 tickers). data/ directory populated. | In Progress |
| 2026-05-22 13:15 | F013 Password Gate: Created PasswordGate.tsx with SHA-256 hashed password, localStorage persistence, Bloomberg terminal aesthetic (black bg, amber text, JetBrains Mono). Wrapped App.tsx routes. npm run build clean. Updated feature_list.json + progress.md. | ✅ Complete |

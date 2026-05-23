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
| 2026-05-22 13:00 | Phase 2 Data Pipeline: Initial scraper + synthetic data | ✅ Complete |
| 2026-05-22 13:15 | F013 Password Gate | ✅ Complete |
| 2026-05-22 15:30 | Phase 2: Fixed SEC scraper + real data (60 trades) | ✅ Complete |
| 2026-05-23 06:07 | Night Shift 7: Phase 3.1 Finviz Screener (F014) | ✅ Complete |
| 2026-05-23 10:22 | Night Shift 8: Phase 3.2 Heatmap + Treemap (F015) | ✅ Complete |

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
- [x] F009: Insider history timeline in Q2

## Deployment ✅
- [x] GitHub repo: https://github.com/james0015-pro/neixian
- [x] GitHub Pages: https://james0015-pro.github.io/neixian/
- [x] gh-pages branch with built dist
- [x] Pages source set to gh-pages branch (root)

## Phase 2: Data Layer ✅
- [x] Task 2.1: Python scraper scripts — `scripts/scrape_sec.py`
- [x] Task 2.2: Real SEC EDGAR data (60 real trades, all 20 tickers)
- [x] Fixed CIK URL bug: company CIK (not insider CIK) for raw filing URLs
- [x] Fixed regex case-sensitivity: SEC uses camelCase XML tags (nonDerivativeTransaction)
- [x] Added derivative transaction parsing (option exercises = BUY signals)
- [x] Data merged: 60 real SEC trades + 25 existing mock trades = 67 total
- [x] npm run build passes clean with real data

**Scraper details:**
- Zero dependencies: Python stdlib only (urllib + re + json)
- Handles SEC rate limits (10 req/s) with adaptive delays
- Parses both non-derivative (open market) and derivative (option exercise) transactions
- Output goes to `data/insider_trades.json` (raw) and `src/data/insider-trades.json` (frontend)

**Real data examples (May 2026):**
- Amy Coleman (MSFT EVP HR) sold 1,262 shares @ $411.34 → $519K
- Mark Stevens (NVDA Director) sold multiple lots → insider selling signals
- Philipp Schindler (GOOGL CBO) gifted shares (G code) — estate planning
- Matthew Garman (AMZN) exercised options and sold (M+S) — compensation
- Dina Powell (META Director) exercised options (M) — insider confidence

## Phase 3: Finviz-style Screener 🚧
- [x] Task 3.1: Finviz-style filter bar + sortable screener page (F014)
- [x] Task 3.2: Heatmap/treemap views (F015)
- [ ] Task 3.3: Stock detail page with charts + stats (F016)

## Phase 4: Polish & Security ✅
- [x] F012: GitHub Pages deploy
- [x] F013: Password gate for beta (SHA-256 hash, localStorage auth, Bloomberg-style UI)

## Current State
- **Live URL**: https://james0015-pro.github.io/neixian/
- **Real data**: 67 SEC EDGAR Form 4 trades (23 buys, 37 sells) + mock data
- **Coverage**: All 20 tracked tickers — 100% success rate scraping SEC
- **Quadrants**: Q1=Insider table, Q2=Detail panel + Chart + Timeline, Q3=Institution rankings, Q4=Summary stats
- **Features**: Sortable columns, BUY/SELL filter, search, keyboard nav (1-4, ESC, /)
- **Screener (F014)**: `/screener` route, DIR filter (ALL/BUY/SELL), ticker dropdown, SUMMARY/TRADES view modes, 9 sortable summary columns + 8 sortable trade columns, computed signal scores, TERM/SCRN nav toggle
- **Heatmap (F015)**: `/heatmap` route, colored tile grid (SIGNAL/NET_FLOW/VOLUME modes), adjustable tile size (40-120px), color legend, hover tooltips, HTMP active nav
- **Treemap (F015)**: `/treemap` route, SVG treemap (INSIDER_NET/BUY_RATIO/TOTAL_VALUE modes), tile size proportional to trade volume, hover details, TRMP active nav
- **Dual-page nav**: TERM/SCRN/HTMP/TRMP toggle buttons on all page headers, consistent active-state styling
- **Styling**: Pure Bloomberg terminal (#000 bg, #ff8c00 amber, JetBrains Mono, inline styles)
- **Password gate**: Active, SHA-256 hashed, localStorage persistence

## Next Up (Priority Order)
1. **Phase 3.3:** Stock detail page with charts + stats (F016)
2. **Data freshness:** Set up cron job to scrape SEC EDGAR daily
3. **Institutions:** Enhance with real yfinance institutional ownership data

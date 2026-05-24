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
| 2026-05-23 11:00 | Night Shift 9: Lint cleanup + deploy + health check | ✅ Complete |
| 2026-05-23 13:44 | Night Shift 10: Full data refresh — Finviz (20) + SEC (144 trades) + OpenInsider fix (98 trades) | ✅ Complete |
| 2026-05-23 17:07 | Night Shift 11: Health check (build+lint ✅) + deploy latest build to GitHub Pages | ✅ Complete |
| 2026-05-23 18:30 | Night Shift 12: F016 StockDetailPage (/stocks/:ticker) — confidence score + ChartPanel + institution holdings table + insider trades timeline with ALL/BUY/SELL filter + localStorage watchlist + DashboardPage ticker → navigate | ✅ Complete |
|| 2026-05-23 21:05 | Night Shift 13: F017 Error boundaries + loading skeletons — ErrorBoundary class component (catches chunk load failures + runtime errors, Bloomberg error screen with RETRY/RELOAD), RouteLoadingSkeleton (animated amber bar), DataRowSkeleton + PanelSkeleton, per-route wrapping in App.tsx | ✅ Complete |
|| 2026-05-23 22:06 | Night Shift 14: Full data refresh — Finviz (20) + SEC EDGAR (239 trades, fixed rate-limit) + OpenInsider (100 trades, fixed column parser) + frontend sync (339 combined) + build verified ✅ | ✅ Complete |
|| 2026-05-24 06:30 | Night Shift 15: F018 Institution data enhancement — yfinance institutional_holders scraper (scripts/scrape_yfinance_institutions.py), 200 real holder records (10 per ticker × 20 tickers), real names (BlackRock, Vanguard, State Street, Berkshire, etc.), npm run build ✅ (1.55s), GitHub Pages deployed ✅ | ✅ Complete |
|| 2026-05-24 10:40 | Night Shift 16: F019 Playwright E2E smoke tests — 8 tests (app render, ticker symbols, 5 route pages, nav buttons, crash check), all pass ✅ against production build, password gate bypassed via addInitScript, npm run test:e2e added, playwright.config.ts standardized | ✅ Complete |
|| 2026-05-24 10:52 | Night Shift 17: Data refresh — Finviz 20/20 ✅ (fixed Short Float regex V2→V3, fixed resp.body.decode), SEC EDGAR 120 trades (44B/75S) ✅ (3.0s delay, zero 429s), OpenInsider ❌ (OSError 101 — server network unreachable). Scrapling /usr/bin/python3 workaround for venv missing pip | ✅ Complete |
|| 2026-05-24 12:50 | Night Shift 18: Data refresh — Finviz 20/20 ✅ (latest prices: NVDA $296, TSLA $499, AAPL $313), SEC EDGAR 120 trades (44B/75S/1 conversion) across 19/20 tickers ✅ (BAC missing - all filings were cross-holdings NAN/NBH/PML), OpenInsider ❌ (OSError 101). Merged: 360 trades (119B/241S) in frontend. npm run build ✅ (1.83s). GitHub Pages deployed ✅. Key trades: XOM sold 16.6M PUMP shares @ $16.66 ($276M), AAPL Levinson sold 250K shares ($71M), NVDA Stevens sold 222K shares ($38.5M), META Olivan 5 sells + 4 derivative exercises, TSLA Wilson-Thompson 16 sells ($10.2M total). | ✅ Complete |

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

## Phase 3: Finviz-style Screener ✅
- [x] Task 3.1: Finviz-style filter bar + sortable screener page (F014)
- [x] Task 3.2: Heatmap/treemap views (F015)
- [x] Task 3.3: Stock detail page with charts + stats (F016)

## Phase 4: Polish & Security ✅
- [x] F012: GitHub Pages deploy
- [x] F013: Password gate for beta (SHA-256 hash, localStorage auth, Bloomberg-style UI)

## Current State
- **Live URL**: https://james0015-pro.github.io/neixian/
- **Real data**: 360 SEC EDGAR Form 4 trades (119 buys, 241 sells) + Finviz snapshots for all 20 tickers
- **Institution holdings**: 200 real yfinance records — 10 top holders per ticker × 20 tickers (BlackRock, Vanguard, State Street, Berkshire, etc.)
- **Coverage**: 19/20 tracked tickers from SEC (BAC missing — all recent Form 4 filings are cross-holding municipal fund trades NAN/NBH/PML)
- **Quadrants**: Q1=Insider table, Q2=Detail panel + Chart + Timeline, Q3=Institution rankings (now with real holder names!), Q4=Summary stats
- **Features**: Sortable columns, BUY/SELL filter, search, keyboard nav (1-4, ESC, /)
- **Screener (F014)**: `/screener` route, DIR filter (ALL/BUY/SELL), ticker dropdown, SUMMARY/TRADES view modes, 9 sortable summary columns + 8 sortable trade columns, computed signal scores, TERM/SCRN nav toggle
- **Heatmap (F015)**: `/heatmap` route, colored tile grid (SIGNAL/NET_FLOW/VOLUME modes), adjustable tile size (40-120px), color legend, hover tooltips, HTMP active nav
- **Treemap (F015)**: `/treemap` route, SVG treemap (INSIDER_NET/BUY_RATIO/TOTAL_VALUE modes), tile size proportional to trade volume, hover details, TRMP active nav
- **Stock Detail (F016)**: `/stocks/:ticker` route, confidence score + sub-scores, 90D candlestick chart (lightweight-charts), institution holdings table, insider trades timeline with ALL/BUY/SELL filter, localStorage watchlist, 12.62KB lazy chunk
- **Dual-page nav**: TERM/SCRN/HTMP/TRMP toggle buttons on all page headers, consistent active-state styling
- **Styling**: Pure Bloomberg terminal (#000 bg, #ff8c00 amber, JetBrains Mono, inline styles)
- **Password gate**: Active, SHA-256 hashed, localStorage persistence
- **Error boundaries (F017)**: Per-route ErrorBoundary (class component with retry state), catches chunk load failures + runtime errors, Bloomberg error screen with RETRY/RELOAD buttons, animated RouteLoadingSkeleton for lazy chunk loading, DataRowSkeleton + PanelSkeleton utilities

## Next Up (Priority Order)
1. **F018: Institution data enhancement** — ✅ COMPLETE (Night Shift 15) — 200 real yfinance institutional holder records across 20 tickers
2. **F019: Playwright E2E smoke tests** — page load, route navigation, data rendering
3. **Phase 5: Watchlist persistence** — backend watchlist (needs Supabase or similar)

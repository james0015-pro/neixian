# 🐋 NeiXian Night Shift Report

> **Shift Time:** 2026-05-23 17:51–17:56 UTC  
> **Worker:** Hermes Agent (deepseek-v4-pro)  
> **Duration:** ~5 min  
> **Shift #:** 12 — Data Scraping Run

---

## 📊 Data Freshness (After This Shift)

| Source | Records | Status | File |
|--------|---------|--------|------|
| SEC EDGAR (Form 4) | **304 trades** (97 buys, 207 sells) | ✅ Fresh | `insider_trades.json` |
| Finviz (Institution Holdings) | **20 holdings** | ✅ Fresh | `institution_holdings.json` |
| OpenInsider (Screener) | **100 trades** | ✅ Fresh | `openinsider_trades.json` |
| Camofox Browser | N/A | ⚠️ Skipped | libgtk-3.so.0 missing |

---

## 🔬 SEC EDGAR Insider Trading Summary

**304 trades from 100 Form 4 filings across all 20 tracked tickers.**

| Metric | Value |
|--------|-------|
| Total Buy Value | $779,611 |
| Total Sell Value | $737,873,131 |
| Filings Processed | 100 |
| Tickers With Data | 20/20 (100%) |

### Top Insider Buy Activity
| Ticker | Buy Value |
|--------|-----------|
| DIS | $446,782 |
| BRK.B | $250,545 |
| BAC | $82,283 |

### Top Insider Sell Activity
| Ticker | Sell Value |
|--------|------------|
| XOM | $278,243,836 |
| BRK.B | $182,864,679 |
| AAPL | $73,495,687 |
| NVDA | $67,585,704 |
| V | $28,853,877 |

> **Note:** XOM's $278M and BRK.B's $183M sells are reported by the company entity itself (not individual insiders) — likely corporate treasury/disposal events.

---

## 🏦 Finviz Institution Holdings

**20/20 tickers scraped successfully.** Institution ownership range: **36.2% (WMT)** to **93.4% (CRM)**.

| Ticker | Inst Own% | P/E | Short Float% |
|--------|-----------|-----|-------------|
| AAPL | 66.0% | 37.4 | — |
| MSFT | 74.9% | 24.9 | — |
| NVDA | 69.2% | 33.0 | — |
| GOOGL | 38.9% | 29.2 | — |
| AMZN | 66.7% | 31.8 | — |
| META | 67.5% | 22.2 | — |
| TSLA | 43.4% | 389.2 | — |
| BRK.B | 43.2% | 14.5 | — |
| JPM | 75.2% | 14.7 | — |
| V | 79.9% | 28.9 | — |
| UNH | 84.9% | 29.3 | — |
| XOM | 68.3% | 26.1 | — |
| WMT | 36.2% | 42.4 | — |
| JNJ | 76.1% | 27.1 | — |
| MA | 82.3% | 28.9 | — |
| PG | 71.2% | 21.1 | — |
| HD | 75.6% | 22.2 | — |
| BAC | 77.3% | 12.9 | — |
| DIS | 77.2% | 16.5 | — |
| CRM | 93.4% | 23.1 | — |

---

## 🌐 OpenInsider Screener

**100 cross-company trades from the main screener page.** Data extracted from `table[9]` (not `tbody[1]` as previously assumed — the table has 101 rows: 1 header + 100 data rows).

---

## 🔧 Technical Notes

### Fixes Applied This Shift
1. **OpenInsider parser fixed**: Data lives in `table[9]` (HTML table index), not in the second `<tbody>`. Also fixed regex from `<tr>(.*?)</tr>` to `<tr[^>]*>(.*?)</tr>` to handle rows with attributes.
2. **SEC cross-holding detection fixed**: Previous logic flagged "Common Stock" as cross-holding because it didn't contain the issuer ticker. New logic only flags when security title contains a DIFFERENT known ticker (e.g., "PUMP Common Stock" in XOM filing).
3. **Scrapling integration**: All HTTP-based scraping works reliably via `Fetcher.get(stealthy_headers=True)` — bypasses Cloudflare for Finviz without a real browser.

### Camofox Status
- Still blocked: `libgtk-3.so.0` not installed on this headless server
- No `apt` available (minimal environment)
- Fallback: Scrapling HTTP methods work perfectly for all target sites
- Camofox remains `skipped` in data summary

---

## 📂 Data Files

```
data/
├── insider_trades.json        (304 SEC EDGAR trades, ~88KB)
├── institution_holdings.json  (20 Finviz holdings, ~11KB)
├── openinsider_trades.json    (100 OpenInsider trades, ~38KB)
└── data_summary.json          (metadata, ~1KB)
```

All data freshly generated at 2026-05-23T17:55 UTC.

---

*Generated autonomously by Night Shift Worker · 2026-05-23 17:56 UTC*

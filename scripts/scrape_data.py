#!/usr/bin/env python3
"""
NeiXian (neixian) — SEC EDGAR + Finviz Data Scraper
=====================================================
Fetches:
  1. Finviz institutional ownership snapshots (via Scrapling)
  2. SEC EDGAR Form 4 insider trading filings (via raw .txt parsing)
  3. OpenInsider cross-company insider trades (fallback)

Output: neixian/data/insider_trades.json + institution_holdings.json

Usage:
  python scripts/scrape_data.py                    # Full scrape (all 21 tickers)
  python scripts/scrape_data.py --quick            # Quick mode (Finviz + yfinance only)
  python scripts/scrape_data.py --tickers AAPL,NVDA  # Specific tickers
"""

import json, re, time, sys, os, argparse
from datetime import datetime, date
from scrapling.fetchers import Fetcher
from typing import Optional

# ─── Configuration ───
TRACKED_TICKERS = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'JPM', 'V', 'WMT', 'JNJ', 'PG', 'MA', 'UNH',
    'HD', 'BAC', 'DIS', 'ADBE', 'NFLX', 'CRM',
]
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

# ─── CIK Map (from SEC company_tickers.json) ───
CIK_MAP = {
    'AAPL': '320193', 'MSFT': '789019', 'NVDA': '1045810',
    'GOOGL': '1652044', 'AMZN': '1018724', 'META': '1326801',
    'TSLA': '1318605', 'JPM': '19617', 'V': '1403161',
    'WMT': '104169', 'JNJ': '200406', 'PG': '80424',
    'MA': '1141391', 'UNH': '731766', 'HD': '354950',
    'BAC': '70858', 'DIS': '1744489', 'ADBE': '796343',
    'NFLX': '1065280', 'CRM': '1108524',
}


# ═══════════════════════════════════════════
# 1. Finviz — Institutional Ownership Snapshot
# ═══════════════════════════════════════════

def scrape_finviz(ticker: str) -> Optional[dict]:
    """Scrape Finviz quote page for snapshot data including institutional ownership."""
    url = f"https://finviz.com/quote.ashx?t={ticker}"
    try:
        page = Fetcher.get(url, stealthy_headers=True, timeout=15)
        text = str(page.css('body').get())
        if not text or len(text) < 1000:
            return None

        def extract_val(label: str, default=0.0):
            pat = rf'{re.escape(label)}</(?:div|a)></td>\s*<td[^>]*>\s*<div[^>]*>\s*(?:<a[^>]*>)?\s*(?:<b>)?\s*(?:<span[^>]*>)?\s*([\d.,]+[%BMK]?)'
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = m.group(1).replace(',', '')
                if val.endswith('%'): return float(val[:-1])
                if val.endswith('B'): return float(val[:-1]) * 1e9
                if val.endswith('M'): return float(val[:-1]) * 1e6
                if val.endswith('K'): return float(val[:-1]) * 1e3
                try: return float(val)
                except: pass
            return default

        name_m = re.search(r'<title>([^(]+)', text)
        name = name_m.group(1).strip() if name_m else ticker

        return {
            'ticker': ticker,
            'company_name': name,
            'market_cap': extract_val('Market Cap'),
            'price': extract_val('Price'),
            'pe_trailing': extract_val('P/E'),
            'pe_forward': extract_val('Forward P/E'),
            'peg': extract_val('PEG'),
            'inst_own_pct': extract_val('Inst Own'),       # Institutional Ownership %
            'insider_own_pct': extract_val('Insider Own'),  # Insider Ownership %
            'insider_trans_pct': extract_val('Insider Trans'), # Net insider transactions
            'short_float_pct': extract_val('Short Float'),
            'short_ratio': extract_val('Short Ratio'),
            'roe': extract_val('ROE'),
            'beta': extract_val('Beta'),
            'rsi14': extract_val('RSI (14)'),
            'debt_equity': extract_val('Debt/Eq'),
            'profit_margin': extract_val('Profit Margin'),
            'data_date': date.today().isoformat(),
            'source': 'Finviz',
        }
    except Exception as e:
        print(f"  WARN Finviz {ticker}: {e}")
        return None


# ═══════════════════════════════════════════
# 2. SEC EDGAR — Form 4 Insider Trades
# ═══════════════════════════════════════════

def scrape_sec_edgar_insider(ticker: str, limit: int = 10) -> list[dict]:
    """
    Fetch Form 4 insider trades via SEC EDGAR submissions API + raw .txt parsing.
    Uses the insider's CIK extracted from the accession number for URL construction.
    """
    cik = CIK_MAP.get(ticker, '')
    if not cik:
        return []

    # Step 1: Get recent Form 4 filings from submissions API
    submissions_url = f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json"
    try:
        page = Fetcher.get(submissions_url, stealthy_headers=True, timeout=20,
                          headers={'User-Agent': 'NeiXian/1.0 (neixian@example.com)'})
        raw = page.css('body').get()
        # Extract JSON from HTML wrapper
        json_match = re.search(r'<body>(.*?)</body>', str(raw), re.DOTALL)
        if not json_match:
            # Try raw response
            json_text = str(raw)
            if not json_text.startswith('{'):
                return []
            data = json.loads(json_text)
        else:
            data = json.loads(json_match.group(1))

        filings = data.get('filings', {}).get('recent', {})
        if not filings:
            return []

        # Filter Form 4 filings
        form_types = filings.get('form', [])
        accession_numbers = filings.get('accessionNumber', [])
        filing_dates = filings.get('filingDate', [])
        primary_docs = filings.get('primaryDocument', [])

        trades = []
        for i, ft in enumerate(form_types):
            if ft != '4' or len(trades) >= limit:
                continue
            if '4/A' in ft:  # Skip amendments
                continue

            accession = accession_numbers[i]
            filing_date = filing_dates[i]

            # Step 2: Build raw .txt URL (insider's CIK from accession)
            insider_cik = accession.split('-')[0].lstrip('0')
            acc_no_dash = accession.replace('-', '')
            txt_url = f"https://www.sec.gov/Archives/edgar/data/{insider_cik}/{acc_no_dash}/{accession}.txt"

            # Step 3: Fetch raw filing and parse XML
            parsed = _parse_sec_filing(txt_url, ticker, filing_date)
            if parsed:
                trades.extend(parsed)
                time.sleep(0.3)  # Rate limit

        return trades[:limit]

    except Exception as e:
        print(f"  WARN SEC EDGAR {ticker}: {e}")
        return []


def _parse_sec_filing(txt_url: str, ticker: str, filing_date: str) -> list[dict]:
    """Parse SEC EDGAR raw .txt filing for insider trade data."""
    try:
        page = Fetcher.get(txt_url, stealthy_headers=True, timeout=20,
                          headers={'User-Agent': 'NeiXian/1.0 (neixian@example.com)'})
        text = str(page.css('body').get())

        # Find XML block (case-insensitive)
        text_lower = text.lower()
        xml_start = text_lower.find('<xml>')
        xml_end = text_lower.find('</xml>', xml_start)
        if xml_start < 0 or xml_end <= xml_start:
            return []

        xml = text[xml_start:xml_end + 6]

        # Helper functions (all tags lowercase)
        def _tag(xml_block, tag):
            m = re.search(f'<{tag}>(.*?)</{tag}>', xml_block, re.DOTALL | re.IGNORECASE)
            return m.group(1).strip() if m else None

        def _val(xml_block, tag):
            m = re.search(f'<{tag}>\\s*<value>(.*?)</value>', xml_block, re.DOTALL | re.IGNORECASE)
            return m.group(1).strip() if m else None

        insider_name = _tag(xml, 'rptownername') or 'Unknown'
        company = _tag(xml, 'issuername') or ticker

        # Parse non-derivative transactions
        trades = []
        nd_blocks = re.findall(r'<nonderivativetransaction>(.*?)</nonderivativetransaction>', xml, re.DOTALL)
        for nd in nd_blocks:
            code = _tag(nd, 'transactioncode')
            if not code:
                continue

            shares_str = _val(nd, 'transactionshares') or '0'
            price_str = _val(nd, 'transactionpricepershare') or '0'
            shares = float(shares_str.replace(',', '')) if shares_str else 0
            price = float(price_str.replace(',', '')) if price_str else 0
            acquired = _val(nd, 'transactionacquireddisposedcode')
            is_buy = acquired == 'A'
            security = _val(nd, 'securitytitle') or 'Common Stock'
            trade_date = _val(nd, 'transactiondate') or filing_date

            trades.append({
                'ticker': ticker,
                'company_name': company,
                'insider_name': insider_name,
                'title': _tag(xml, 'officertitle') or '',
                'transaction_type': 'BUY' if is_buy else 'SELL',
                'code': code,
                'security': security,
                'shares': shares,
                'price': price,
                'total_value': shares * price if shares and price else 0,
                'trade_date': trade_date,
                'filing_date': filing_date,
                'filing_url': txt_url,
                'source': 'SEC EDGAR',
            })

        return trades

    except Exception as e:
        return []


# ═══════════════════════════════════════════
# 3. OpenInsider — Cross-Company Insider Trades (Fallback)
# ═══════════════════════════════════════════

def scrape_openinsider(ticker: Optional[str] = None, limit: int = 50) -> list[dict]:
    """Scrape OpenInsider for insider trading data."""
    try:
        from openinsider import fetch_insider_trades as oi_fetch
        return oi_fetch(ticker=ticker, limit=limit)
    except ImportError:
        # Inline fallback using urllib
        import urllib.request
        import urllib.error
        from html.parser import HTMLParser

        class InsiderTableParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.in_table = self.in_row = self.in_cell = False
                self.current_cell = ''
                self.current_row = []
                self.rows = []
            def handle_starttag(self, tag, attrs):
                if tag == 'table': self.in_table = True
                elif tag == 'tr' and self.in_table:
                    self.in_row = True
                    self.current_row = []
                elif tag == 'td' and self.in_row:
                    self.in_cell = True
                    self.current_cell = ''
            def handle_endtag(self, tag):
                if tag == 'table': self.in_table = False
                elif tag == 'tr' and self.in_row:
                    self.in_row = False
                    if len(self.current_row) >= 10:
                        self.rows.append(self.current_row)
                elif tag == 'td' and self.in_cell:
                    self.in_cell = False
                    self.current_row.append(self.current_cell.strip())
            def handle_data(self, data):
                if self.in_cell: self.current_cell += data

        params = {
            's': ticker or '', 'fd': '730', 'xp': '1', 'xs': '1',
            'sortcol': '0', 'cnt': str(min(limit, 100)), 'page': '1',
        }
        query = '&'.join(f'{k}={v}' for k, v in params.items())
        url = f'http://openinsider.com/screener?{query}'

        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='replace')

        parser = InsiderTableParser()
        parser.feed(html)
        results = []
        for row in parser.rows:
            if len(row) < 12: continue
            try:
                results.append({
                    'ticker': row[2].strip().upper(),
                    'insider_name': row[4].strip(),
                    'title': row[5].strip(),
                    'trade_type': row[6].strip(),
                    'price': float(row[7].replace('$', '').replace(',', '') or 0),
                    'qty': int(row[8].replace(',', '') or 0),
                    'owned': int(row[9].replace(',', '') or 0),
                    'delta_own': float(row[10].replace('%', '').replace(',', '') or 0),
                    'value': float(row[11].replace('$', '').replace(',', '') or 0),
                    'filing_date': row[0].strip(),
                    'trade_date': row[1].strip(),
                    'source': 'OpenInsider',
                })
            except (ValueError, IndexError):
                continue
            if len(results) >= limit: break
        return results


# ═══════════════════════════════════════════
# Main Pipeline
# ═══════════════════════════════════════════

def scrape_all(tickers: list[str], quick: bool = False) -> dict:
    """Run full data pipeline for all tickers."""
    institutions = []
    insider_trades = []

    for i, t in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] {t}")

        # Finviz snapshot (always)
        snap = scrape_finviz(t)
        if snap:
            institutions.append(snap)
            print(f"  Finviz: inst={snap.get('inst_own_pct','?')}% insider={snap.get('insider_own_pct','?')}%")

        if not quick:
            # SEC EDGAR Form 4
            sec_trades = scrape_sec_edgar_insider(t, limit=10)
            if sec_trades:
                insider_trades.extend(sec_trades)
                print(f"  SEC EDGAR: {len(sec_trades)} trades")
            else:
                print(f"  SEC EDGAR: 0 trades")

            time.sleep(1.0)
        else:
            time.sleep(0.3)

    # If no SEC trades, fallback to OpenInsider
    if not insider_trades:
        print("\nFalling back to OpenInsider...")
        oi_trades = scrape_openinsider(limit=100)
        insider_trades = oi_trades
        print(f"  OpenInsider: {len(oi_trades)} trades")

    return {
        'institution_holdings': institutions,
        'insider_trades': insider_trades,
    }


def save_data(data: dict, out_dir: str = DATA_DIR):
    """Save scraped data to JSON files."""
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.now().isoformat()

    # Institution holdings
    inst_output = {
        'generated_at': ts,
        'source': 'Finviz + SEC EDGAR',
        'total_holdings': len(data['institution_holdings']),
        'holdings': data['institution_holdings'],
    }
    inst_path = os.path.join(out_dir, 'institution_holdings.json')
    with open(inst_path, 'w', encoding='utf-8') as f:
        json.dump(inst_output, f, ensure_ascii=False, indent=2)

    # Insider trades
    trade_output = {
        'generated_at': ts,
        'source': 'SEC EDGAR + OpenInsider',
        'total_trades': len(data['insider_trades']),
        'trades': data['insider_trades'],
    }
    trade_path = os.path.join(out_dir, 'insider_trades.json')
    with open(trade_path, 'w', encoding='utf-8') as f:
        json.dump(trade_output, f, ensure_ascii=False, indent=2)

    # Summary
    summary_path = os.path.join(out_dir, 'data_summary.json')
    buy_count = sum(1 for t in data['insider_trades'] if t.get('transaction_type') == 'BUY')
    sell_count = sum(1 for t in data['insider_trades'] if t.get('transaction_type') == 'SELL')
    summary = {
        'generated_at': ts,
        'tickers': len(data['institution_holdings']),
        'institution_holdings': len(data['institution_holdings']),
        'insider_trades': len(data['insider_trades']),
        'buys': buy_count,
        'sells': sell_count,
    }
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    print(f"\nData saved to {out_dir}:")
    print(f"  institution_holdings.json: {len(data['institution_holdings'])} holdings")
    print(f"  insider_trades.json: {len(data['insider_trades'])} trades")
    print(f"  data_summary.json: {json.dumps(summary)}")

    return {
        'institution_holdings': inst_path,
        'insider_trades': trade_path,
        'data_summary': summary_path,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='NeiXian data scraper')
    parser.add_argument('--tickers', type=str, help='Comma-separated tickers')
    parser.add_argument('--quick', action='store_true', help='Quick mode (Finviz only)')
    parser.add_argument('--output', type=str, default=DATA_DIR)
    args = parser.parse_args()

    tickers = [t.strip().upper() for t in args.tickers.split(',')] if args.tickers else TRACKED_TICKERS

    print(f"NeiXian Data Scraper — {len(tickers)} tickers")
    print(f"  {'Quick mode (Finviz only)' if args.quick else 'Full mode (Finviz + SEC EDGAR + OpenInsider)'}")
    print(f"  Output: {args.output}\n")

    data = scrape_all(tickers, quick=args.quick)
    paths = save_data(data, args.output)

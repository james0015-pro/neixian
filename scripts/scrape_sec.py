#!/usr/bin/env python3
"""
NeiXian (neixian) — SEC EDGAR Insider Trades Scraper
=====================================================
Self-contained scraper using Python stdlib only (urllib + re + json).
No external dependencies needed — works on any Python 3.9+.

Features:
- Fetches Form 4 filings from SEC EDGAR submissions API
- Parses raw .txt filings for insider trade data
- Handles SEC rate limits (10 req/s) with adaptive delays
- Maps trades to frontend-compatible JSON format

Usage:
  python3 scripts/scrape_sec.py                     # All tickers
  python3 scripts/scrape_sec.py --ticker NVDA       # Single ticker
  python3 scripts/scrape_sec.py --limit 20          # More trades per ticker
  python3 scripts/scrape_sec.py --ticker NVDA,AAPL  # Specific tickers
"""

import json, re, time, sys, os, argparse
from datetime import datetime
from urllib.request import Request, urlopen, HTTPError, URLError
from urllib.parse import urlencode

# ─── Configuration ───
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_DIR, 'data')
SRC_DATA_DIR = os.path.join(PROJECT_DIR, 'src', 'data')

TRACKED_TICKERS = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'JPM', 'V', 'WMT', 'JNJ', 'PG', 'MA', 'UNH',
    'HD', 'BAC', 'DIS', 'ADBE', 'NFLX', 'CRM',
]

# CIK Map — SEC 10-digit Central Index Keys for our tracked tickers
CIK_MAP = {
    'AAPL': '320193',  'MSFT': '789019',  'NVDA': '1045810',
    'GOOGL': '1652044', 'AMZN': '1018724', 'META': '1326801',
    'TSLA': '1318605', 'JPM': '19617',    'V': '1403161',
    'WMT': '104169',   'JNJ': '200406',   'PG': '80424',
    'MA': '1141391',   'UNH': '731766',   'HD': '354950',
    'BAC': '70858',    'DIS': '1744489',  'ADBE': '796343',
    'NFLX': '1065280', 'CRM': '1108524',
}

COMPANY_NAMES = {
    'AAPL': 'Apple Inc.',      'MSFT': 'Microsoft Corp.',
    'NVDA': 'NVIDIA Corp.',    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.', 'META': 'Meta Platforms Inc.',
    'TSLA': 'Tesla Inc.',      'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',          'WMT': 'Walmart Inc.',
    'JNJ': 'Johnson & Johnson', 'PG': 'Procter & Gamble Co.',
    'MA': 'Mastercard Inc.',   'UNH': 'UnitedHealth Group Inc.',
    'HD': 'Home Depot Inc.',   'BAC': 'Bank of America Corp.',
    'DIS': 'Walt Disney Co.',   'ADBE': 'Adobe Inc.',
    'NFLX': 'Netflix Inc.',    'CRM': 'Salesforce Inc.',
}

UA = 'NeiXian/1.0 (neixian-scraper@example.com)'


def http_get(url: str, timeout: int = 20) -> tuple[int, str]:
    """HTTP GET with SEC-required User-Agent. Returns (status, body)."""
    req = Request(url, headers={'User-Agent': UA})
    try:
        with urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode('utf-8', errors='replace')
    except HTTPError as e:
        body = e.read().decode('utf-8', errors='replace') if e.fp else ''
        return e.code, body
    except URLError as e:
        return 0, str(e)


def fetch_filings(ticker: str) -> list[dict]:
    """Fetch recent Form 4 filings from SEC submissions API."""
    cik = CIK_MAP.get(ticker, '')
    if not cik:
        return []

    url = f"https://data.sec.gov/submissions/CIK{int(cik):010d}.json"
    print(f"  Fetching submissions: {ticker}...")
    status, body = http_get(url)

    if status != 200:
        print(f"    WARN: HTTP {status}")
        return []

    # Handle JSON wrapped in <body> tags (Scrapling artifact) or raw JSON
    if body.startswith('<'):
        m = re.search(r'<body>(.*?)</body>', body, re.DOTALL)
        body = m.group(1) if m else body

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return []

    recent = data.get('filings', {}).get('recent', {})
    if not recent:
        return []

    forms = recent.get('form', [])
    accessions = recent.get('accessionNumber', [])
    dates = recent.get('filingDate', [])
    primary_docs = recent.get('primaryDocument', [])

    filings = []
    for i, form in enumerate(forms):
        if form != '4' or '4/A' in form:
            continue
        filings.append({
            'accession': accessions[i],
            'filing_date': dates[i],
            'primary_doc': primary_docs[i] if i < len(primary_docs) else '',
        })

    print(f"    Found {len(filings)} Form 4 filings")
    return filings


def parse_filing_text(text: str, ticker: str, filing_date: str,
                      filing_url: str) -> list[dict]:
    """Parse SEC EDGAR raw .txt filing for insider trade data.

    ALL XML tags in SEC filings are LOWERCASE. We use case-insensitive matching.
    """
    text_lower = text.lower()
    xml_start = text_lower.find('<xml>')
    xml_end = text_lower.find('</xml>', xml_start)

    if xml_start < 0 or xml_end <= xml_start:
        return []

    xml = text[xml_start:xml_end + 6]  # 6 = len('</xml>')

    def _tag(xml_block, tag):
        m = re.search(f'<{tag}>(.*?)</{tag}>', xml_block, re.DOTALL | re.IGNORECASE)
        return m.group(1).strip() if m else None

    def _val(xml_block, tag):
        m = re.search(f'<{tag}>\\s*<value>(.*?)</value>', xml_block,
                      re.DOTALL | re.IGNORECASE)
        return m.group(1).strip() if m else None

    insider_name = _tag(xml, 'rptownername') or 'Unknown'
    company = _tag(xml, 'issuername') or COMPANY_NAMES.get(ticker, ticker)
    officer_title = _tag(xml, 'officertitle') or ''
    is_director = _tag(xml, 'isdirector') == '1'
    is_officer = _tag(xml, 'isofficer') == '1'

    # Build role string
    role_parts = []
    if is_officer and officer_title:
        role_parts.append(officer_title)
    elif is_officer:
        role_parts.append('Officer')
    if is_director:
        role_parts.append('Director')
    role = ' & '.join(role_parts) if role_parts else 'Insider'

    trades = []

    # Parse non-derivative transactions (open market sales/purchases)
    nd_blocks = re.findall(
        r'<nonderivativetransaction>(.*?)</nonderivativetransaction>',
        xml, re.DOTALL | re.IGNORECASE)

    for nd in nd_blocks:
        code = _tag(nd, 'transactioncode')
        if not code:
            continue

        shares_str = _val(nd, 'transactionshares') or '0'
        price_str = _val(nd, 'transactionpricepershare') or '0'
        try:
            shares = float(shares_str.replace(',', ''))
            price = float(price_str.replace(',', ''))
        except ValueError:
            continue

        acquired = _val(nd, 'transactionacquireddisposedcode')
        trade_date_str = _val(nd, 'transactiondate') or filing_date
        security = _val(nd, 'securitytitle') or 'Common Stock'
        shares_after_str = _val(nd, 'sharesownedfollowingtransaction') or '0'
        try:
            shares_after = float(shares_after_str.replace(',', ''))
        except ValueError:
            shares_after = 0

        is_buy = acquired == 'A'
        total_value = shares * price

        # Map SEC codes to BUY/SELL
        if code in ('P', 'A'):  # Purchase, Award/Grant
            direction = 'BUY'
        elif code in ('S', 'F', 'D'):  # Sale, Tax withholding, Disposition
            direction = 'SELL'
        elif is_buy:
            direction = 'BUY'
        else:
            direction = 'SELL'

        trades.append({
            'ticker': ticker,
            'company_name': company,
            'insider_name': insider_name,
            'insider_title': role,
            'transaction_type': direction,
            'code': code,
            'security': security,
            'shares': shares,
            'price': price,
            'total_value': total_value,
            'shares_held_after': shares_after,
            'trade_date': trade_date_str,
            'filing_date': filing_date,
            'filing_url': filing_url,
            'source': 'SEC EDGAR',
        })

    # Parse derivative transactions (option exercises, RSU vesting, etc.)
    d_blocks = re.findall(
        r'<derivativetransaction>(.*?)</derivativetransaction>',
        xml, re.DOTALL | re.IGNORECASE)

    for d in d_blocks:
        code = _tag(d, 'transactioncode')
        if not code:
            continue

        # Derivative transactions often have:
        # - 'M' = option exercise (most important — insider converting options to shares)
        # - 'A' = grant/award of new options
        # - 'F' = tax withholding (less interesting)
        if code not in ('M', 'A'):
            continue

        shares_str = _val(d, 'transactionshares') or '0'
        # For exercises: price is the strike price; for grants: often $0
        price_str = _val(d, 'transactionpricepershare') or '0'
        # Try to get the exercise price
        ex_price_str = (_val(d, 'exercisepricepershare') or
                        _val(d, 'exerciseorconversionpriceofderivativesecuritytransactionpricepershare') or '0')
        try:
            shares = float(shares_str.replace(',', ''))
            price = float(price_str.replace(',', ''))
        except ValueError:
            continue

        acquired = _val(d, 'transactionacquireddisposedcode')
        trade_date_str = _val(d, 'transactiondate') or filing_date
        # Underlying security title (what the option converts to)
        security = (_val(d, 'underlyingsecuritytitle') or
                    _val(d, 'securitytitle') or 'Common Stock')

        # Option exercise → BUY (insider acquiring shares by exercising options)
        direction = 'BUY'
        total_value = shares * price if price > 0 else 0  # Grant may have $0

        trades.append({
            'ticker': ticker,
            'company_name': company,
            'insider_name': insider_name,
            'insider_title': role,
            'transaction_type': direction,
            'code': code,
            'security': security,
            'shares': shares,
            'price': price,
            'total_value': total_value,
            'shares_held_after': 0,  # derivative forms track differently
            'trade_date': trade_date_str,
            'filing_date': filing_date,
            'filing_url': filing_url,
            'source': 'SEC EDGAR',
        })

    return trades


def scrape_ticker(ticker: str, limit: int = 5) -> list[dict]:
    """Full pipeline: fetch Form 4 filings → download raw .txt → parse XML."""
    cik = CIK_MAP.get(ticker, '')
    if not cik:
        return []

    company_cik = str(int(cik))  # e.g., '1045810' (no leading zeros for URL path)

    filings = fetch_filings(ticker)
    if not filings:
        return []

    all_trades = []
    max_filings = min(len(filings), 20)  # check up to 20 filings per ticker

    for idx, filing in enumerate(filings[:max_filings]):
        if len(all_trades) >= limit:
            break

        accession = filing['accession']
        filing_date = filing['filing_date']
        acc_no_dash = accession.replace('-', '')

        # Use COMPANY CIK in URL (not insider CIK from accession!)
        filing_url = (
            f"https://www.sec.gov/Archives/edgar/data/{company_cik}/"
            f"{acc_no_dash}/{accession}.txt"
        )

        print(f"    Filing {idx+1}/{len(filings[:max_filings])}: "
              f"{filing_date} ({accession[:20]}...)")

        status, body = http_get(filing_url, timeout=20)

        if status == 429:
            print(f"      RATE LIMITED — sleeping 60s...")
            time.sleep(60)
            status, body = http_get(filing_url, timeout=20)

        if status != 200:
            print(f"      HTTP {status} — skipping")
            time.sleep(0.6)
            continue

        if len(body) < 500:
            print(f"      Empty response ({len(body)} bytes)")
            time.sleep(0.6)
            continue

        trades = parse_filing_text(body, ticker, filing_date, filing_url)

        if trades:
            all_trades.extend(trades)
            names = set(t.get('insider_name', '?') for t in trades)
            types = set(t.get('code', '?') for t in trades)
            print(f"      ✅ {len(trades)} trades: {', '.join(names)} [{', '.join(types)}]")
        else:
            # Check why: no XML or just no extractable trades
            has_xml = '<xml>' in body.lower()
            if has_xml:
                print(f"      ⏭️  XML found, but no extractable trades (options-exercise-only or amendment)")
            else:
                print(f"      ❌ No XML block found")

        # SEC rate limit: 10 requests/second, be conservative
        time.sleep(0.6)

    return all_trades[:limit]


def transform_for_frontend(scraper_trades: list[dict]) -> list[dict]:
    """Transform scraper output format → frontend src/data/insider-trades.json format."""
    frontend_trades = []
    for i, t in enumerate(scraper_trades):
        frontend_trades.append({
            'id': f"sec-{i+1}",
            'insider_name': t.get('insider_name', 'Unknown'),
            'insider_title': t.get('insider_title', ''),
            'source_company': t.get('company_name', ''),
            'target_company': t.get('company_name', ''),
            'target_ticker': t.get('ticker', ''),
            'transaction_date': t.get('trade_date', t.get('filing_date', '')),
            'transaction_type': t.get('transaction_type', 'SELL'),
            'shares': int(t.get('shares', 0)),
            'price_per_share': t.get('price', 0),
            'total_value': t.get('total_value', 0),
            'shares_held_after': int(t.get('shares_held_after', 0)),
            'filing_date': t.get('filing_date', ''),
        })
    return frontend_trades


def merge_with_existing(new_trades: list[dict], existing_path: str) -> list[dict]:
    """Merge new trades with existing mock data, deduplicating by ticker+insider+date."""
    existing = []
    if os.path.exists(existing_path):
        with open(existing_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)

    # Build dedup key set from existing
    seen = set()
    for t in existing:
        key = (t.get('target_ticker', '').upper(),
               t.get('insider_name', '').lower(),
               t.get('transaction_date', ''))
        seen.add(key)

    # Add new trades (prepended — real data first)
    merged = []
    for t in new_trades:
        key = (t.get('target_ticker', '').upper(),
               t.get('insider_name', '').lower(),
               t.get('transaction_date', ''))
        if key not in seen:
            seen.add(key)
            merged.append(t)

    # Real data first, then existing mock data
    return merged + existing


def save_results(scraper_trades: list[dict], tickers_attempted: int):
    """Save results to both data/ (raw) and src/data/ (frontend)."""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(SRC_DATA_DIR, exist_ok=True)
    ts = datetime.now().isoformat()

    # Save raw scraper output
    raw_output = {
        'generated_at': ts,
        'source': 'SEC EDGAR (urllib, zero deps)',
        'tickers_scraped': tickers_attempted,
        'total_trades': len(scraper_trades),
        'trades': scraper_trades,
    }
    with open(os.path.join(DATA_DIR, 'insider_trades.json'), 'w', encoding='utf-8') as f:
        json.dump(raw_output, f, ensure_ascii=False, indent=2)

    # Transform to frontend format
    frontend_trades = transform_for_frontend(scraper_trades)
    frontend_path = os.path.join(SRC_DATA_DIR, 'insider-trades.json')

    # Merge with existing mock data
    merged = merge_with_existing(frontend_trades, frontend_path)

    with open(frontend_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    # Summary
    buy_count = sum(1 for t in scraper_trades if t.get('transaction_type') == 'BUY')
    sell_count = sum(1 for t in scraper_trades if t.get('transaction_type') == 'SELL')
    summary = {
        'generated_at': ts,
        'tickers_scraped': tickers_attempted,
        'total_trades': len(scraper_trades),
        'frontend_total': len(merged),
        'buys': buy_count,
        'sells': sell_count,
        'new_trades_added': len(frontend_trades),
    }
    with open(os.path.join(DATA_DIR, 'data_summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Results:")
    print(f"  Tickers scraped: {tickers_attempted}")
    print(f"  SEC trades found: {len(scraper_trades)} ({buy_count} buys, {sell_count} sells)")
    print(f"  Frontend total (merged): {len(merged)}")
    print(f"  Saved: {frontend_path}")
    return summary


def main():
    p = argparse.ArgumentParser(description='NeiXian SEC EDGAR insider trades scraper')
    p.add_argument('--ticker', type=str, help='Single ticker or comma-separated list')
    p.add_argument('--limit', type=int, default=5, help='Max trades per ticker')
    p.add_argument('--max-tickers', type=int, default=10, help='Max tickers to scrape')
    args = p.parse_args()

    if args.ticker:
        tickers = [t.strip().upper() for t in args.ticker.split(',')]
    else:
        tickers = TRACKED_TICKERS[:args.max_tickers]

    print(f"NeiXian SEC EDGAR Scraper")
    print(f"  Tickers: {len(tickers)} ({', '.join(tickers[:5])}...{' +' + str(len(tickers)-5) if len(tickers) > 5 else ''})")
    print(f"  Limit: {args.limit} trades/ticker")
    print(f"  Using: Python stdlib (urllib) — zero dependencies\n")

    all_trades = []
    success_count = 0

    for i, ticker in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] {ticker}")
        try:
            trades = scrape_ticker(ticker, args.limit)
            if trades:
                all_trades.extend(trades)
                success_count += 1
                print(f"  ✅ Got {len(trades)} trades")
            else:
                print(f"  ⚠️  No trades found")
        except Exception as e:
            print(f"  ❌ Error: {e}")

        # Space out requests between tickers
        if i < len(tickers) - 1:
            time.sleep(1.0)

    print(f"\nDone scraping {len(tickers)} tickers.")
    print(f"  Success: {success_count}/{len(tickers)}")
    print(f"  Total trades: {len(all_trades)}")

    if all_trades:
        save_results(all_trades, len(tickers))
    else:
        print("\n⚠️ No trades found from SEC EDGAR. The existing mock data remains unchanged.")


if __name__ == '__main__':
    main()

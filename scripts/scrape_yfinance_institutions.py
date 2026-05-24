#!/usr/bin/env python3
"""
Scrape real institutional ownership data from yfinance for 20 tickers.
Output: institution-holdings.json with top 10 holders per ticker.
Zero external dependencies beyond yfinance.
"""
import json, time, sys, os
from datetime import date

TICKERS = [
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'BRK-B', 'JPM', 'V', 'UNH', 'XOM', 'WMT',
    'JNJ', 'MA', 'PG', 'HD', 'BAC', 'DIS', 'CRM',
]

OUTPUT_PATH = '/opt/data/home/projects/neixian/data/institution_holdings.json'
FRONTEND_PATH = '/opt/data/home/projects/neixian/src/data/institution-holdings.json'
PER_TICKER = 10  # top N holders per ticker

def fmt_b(n):
    """Format billions."""
    if n is None: return None
    return round(n, 2)

def scrape_one(ticker, idx):
    """Get institutional holders for one ticker via yfinance."""
    try:
        import yfinance as yf
        tk = yf.Ticker(ticker)
        
        # Get institutional holders
        holders = tk.institutional_holders
        if holders is None or holders.empty:
            print(f"  [{idx:02d}] {ticker}: NO institutional holders data")
            return []
        
        info = tk.info
        company = info.get('longName', info.get('shortName', ticker))
        
        results = []
        for i, row in holders.iterrows():
            holder_name = str(row.get('Holder', i))
            shares = row.get('Shares', 0)
            date_reported = str(row.get('Date Reported', ''))
            pct_out = row.get('% Out', 0)
            value = row.get('Value', 0)
            
            if shares <= 0:
                continue
                
            results.append({
                'institution_name': holder_name,
                'ticker': ticker,
                'company_name': company,
                'shares_held': int(shares),
                'market_value': round(float(value), 2),
                'pct_outstanding': round(float(pct_out) * 100, 4) if pct_out else 0,
                'report_date': str(date_reported)[:10] if date_reported else date.today().isoformat(),
            })
            
            if len(results) >= PER_TICKER:
                break
        
        print(f"  [{idx:02d}] {ticker}: {len(results)} holders (top={results[0]['institution_name'] if results else 'N/A'} ${results[0]['market_value']/1e9:.1f}B)")
        return results
    
    except Exception as e:
        print(f"  [{idx:02d}] {ticker}: ERROR - {e}")
        return []

def main():
    all_holders = []
    succeeded = 0
    failed = 0
    
    for i, ticker in enumerate(TICKERS):
        holders = scrape_one(ticker, i + 1)
        if holders:
            all_holders.extend(holders)
            succeeded += 1
        else:
            failed += 1
        
        if i < len(TICKERS) - 1:
            time.sleep(1.5)  # rate limit
    
    # Assign IDs
    for j, h in enumerate(all_holders):
        h['id'] = f"inst-{j+1:04d}"
        # Add change_qoq and portfolio_weight fields expected by frontend
        if 'change_qoq' not in h:
            h['change_qoq'] = 0  # yfinance doesn't provide this directly
        if 'portfolio_weight' not in h:
            # Use pct_outstanding as a proxy
            h['portfolio_weight'] = h.get('pct_outstanding', 0)
    
    # Save to data/
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_holders, f, ensure_ascii=False, indent=2)
    
    # Copy to frontend src/data/
    os.makedirs(os.path.dirname(FRONTEND_PATH), exist_ok=True)
    with open(FRONTEND_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_holders, f, ensure_ascii=False, indent=2)
    
    tickers_found = len(set(h['ticker'] for h in all_holders))
    
    print(f"\n{'='*60}")
    print(f"SUMMARY:")
    print(f"  Tickers scraped:  {succeeded}/{len(TICKERS)}")
    print(f"  Failed:           {failed}/{len(TICKERS)}")
    print(f"  Total holders:    {len(all_holders)}")
    print(f"  Unique tickers:   {tickers_found}")
    print(f"  Saved to:         {OUTPUT_PATH}")
    print(f"  Frontend copy:    {FRONTEND_PATH}")
    print(f"{'='*60}")
    
    return all_holders

if __name__ == '__main__':
    main()

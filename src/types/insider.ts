export interface InsiderTrade {
  id: string;
  insider_name: string;
  insider_title: string;
  source_company: string;
  target_company: string;
  target_ticker: string;
  transaction_date: string;
  transaction_type: 'BUY' | 'SELL';
  shares: number;
  price_per_share: number;
  total_value: number;
  shares_held_after: number;
  filing_date: string;
}

export interface InsiderSummary {
  insider_name: string;
  title: string;
  source_company: string;
  total_trades: number;
  buy_count: number;
  sell_count: number;
  total_buy_value: number;
  total_sell_value: number;
  tickers_traded: string[];
}

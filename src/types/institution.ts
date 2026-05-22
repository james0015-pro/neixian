export interface InstitutionHolding {
  id: string;
  institution_name: string;
  ticker: string;
  company_name: string;
  shares_held: number;
  market_value: number;
  change_qoq: number;
  portfolio_weight: number;
  report_date: string;
}

export interface InstitutionSummary {
  institution_name: string;
  total_market_value: number;
  holding_count: number;
  top_holdings: InstitutionHolding[];
  change_qoq_avg: number;
}

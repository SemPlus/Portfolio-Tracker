export interface Portfolio {
  id: number;
  name: string;
  created_at: string;
}

export interface Asset {
  id: number;
  portfolio_id: number;
  symbol: string;
  type: 'Stock' | 'ETF' | 'Crypto';
  quantity: number | null;
  invested_amount: number | null;
  currency: string;
  purchase_date: string;
  created_at: string;
}

export interface Quote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  shortName?: string;
  longName?: string;
  sector?: string;
  industry?: string;
  dividendYield?: number;
  trailingAnnualDividendRate?: number;
  marketCap?: number;
}

export interface ChartDataPoint {
  date: string;
  totalValue: number;
  totalInvested: number;
  benchmarkValue?: number;
}

export interface AllocationData {
  name: string;
  value: number;
  percentage: number;
}

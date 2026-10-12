export type FinanceRow = {
  businessUnit: string;
  date: string;
  mrr: number;
  grossMargin: number | null;
  netMargin: number | null;
  arppu: number | null;
  cac: number | null;
  churnRate: number | null;
  ltv: number | null;
  ltvCac: number | null;
  cacPayback: number | null;
  organicSales: number | null;
  referralSales: number | null;
  totalSales: number | null;
  dataStatus: string;
};

export type FinanceData = { rows: FinanceRow[]; source: "live" | "demo"; updatedAt: string; connectionMessage: string | null };

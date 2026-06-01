export type ReportType = 'driver' | 'now' | 'later' | 'merchant';

export interface ReportRow {
  dateRange: string;
  name: string;
  merchantId?: number;
  email?: string;
  deliveredDeliveries: number;
  totalDeliveries: number;
  totalPrice: number;
  salary: number;
  // Status 5 (хаягаар очсон) deliveries
  status5Deliveries: number;
  status5MerchantAmount: number; // 7k per delivery for merchant
  status5DriverAmount: number; // 5k per delivery for driver
  // Orders with status 3 (захиалгын тоо)
  orderCount: number;
}

export interface MerchantReportEmailPayload {
  merchantId: number;
  name: string;
  dateRange: string;
  deliveredDeliveries: number;
  totalDeliveries: number;
  totalPrice: number;
  salary: number;
  status5Deliveries: number;
  orderCount: number;
}

export interface SendMerchantReportEmailsResult {
  success: boolean;
  message: string;
  results: Array<{
    merchantId: number;
    name?: string;
    email?: string;
    success: boolean;
    message?: string;
  }>;
}


export interface GoodRequest {
  id: number;
  type: number; // 1 = create new good, 2 = add stock, 3 = deduct stock
  stock: number;
  approved_stock: number | null;
  status: number; // 1 = pending, 2 = approved, 3 = declined
  ware_id: number;
  merchant_id: number;
  good_id: number | null;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  merchant?: {
    id: number;
    username: string;
  };
  ware?: {
    id: number;
    name: string;
  };
  good?: {
    id: number;
    name: string;
  } | null;
}

export interface CreateGoodRequestPayload {
  type: number; // 1 = create good, 2 = add stock (орлогодох), 3 = deduct stock (зарлагадах)
  amount: number;
  ware_id: number;
  merchant_id: number;
  good_id?: number;  // required for type 2, 3
  name?: string;    // required for type 1 (new good name)
}

export interface ApproveRequestPayload {
  id: number;
}

export interface DeclineRequestPayload {
  id: number;
}


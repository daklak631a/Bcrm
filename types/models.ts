export type UserRole = 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1';
export type InteractionType = 'CALL' | 'MEETING' | 'SMS' | 'EMAIL' | 'VISIT';
export type InteractionResult = 'SUCCESS' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'PENDING';
export type LoanStatus = 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING';
export type DepositStatus = 'ACTIVE' | 'CLOSED' | 'MATURED' | 'PENDING';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id?: string;
  is_active?: boolean;
  full_name_slug?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  title: string;
  description?: string | null;
  target_date: string;
  created_by?: string | null;
  created_at: string;
}

export interface PlanAssignment {
  id: string;
  plan_id: string;
  user_id: string;
  target_loans_amount: number;
  target_deposits_amount: number;
  target_calls: number;
  actual_loans_amount?: number;
  actual_deposits_amount?: number;
  actual_calls?: number;
  target_cif_moi?: number;
  target_bidv_direct?: number;
  target_bh_nhan_tho?: number;
  target_bh_khoan_vay?: number;
  target_huy_dong_tang_rong?: number;
  target_du_no_ngan_han_tang_rong?: number;
  target_du_no_trung_han_tang_rong?: number;
  target_cap_moi_hmtd?: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  plans?: Plan;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  assigned_manager_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  customer_type?: string;
  business_name?: string | null;
  tax_code?: string | null;
  representative_name?: string | null;
  cif_code?: string | null;
  
  // Financial indicators
  loan_short_term?: number;
  loan_mid_long_term?: number;
  hdv_dau_ky?: number;
  hdv_phat_sinh?: number;
  hdv_tang_rong?: number;
  limit_approval_count?: number;
  
  // Cross-sell products
  cif_moi?: boolean;
  smart_banking?: boolean;
  bao_hiem_nhan_tho?: boolean;
  bao_hiem_khoan_vay?: boolean;
  the_tin_dung?: boolean;
  chuyen_tien_ngoai?: boolean;
  merchant_qr?: boolean;
  sp_khac?: string | null;
  
  profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ManagerTransferRequest {
  id: string;
  customer_id: string;
  requester_id: string;
  target_manager_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  requester?: Profile;
  target_manager?: Profile;
}

export interface Loan {
  id: string;
  customer_id: string;
  account_number: string;
  loan_amount: number;
  balance: number;
  start_date: string;
  due_date: string;
  status: LoanStatus;
  overdue_days: number;
  warning_level: string | null;
  created_at: string;
  updated_at: string;
  business_sector?: string | null;
  disbursement_purpose?: string | null;
  collateral_assets?: string | null;
  credit_limit?: number | null;
  loan_method?: string | null;
  term_type?: string | null;
}

export interface Deposit {
  id: string;
  customer_id: string;
  account_number: string;
  amount: number;
  start_date: string;
  maturity_date: string;
  status: DepositStatus;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  customer_id: string;
  manager_id: string;
  type: InteractionType;
  purpose: string;
  result: InteractionResult;
  notes: string | null;
  completion_status: boolean;
  interaction_date: string;
  follow_up_date: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link_url: string | null;
  created_at: string;
}

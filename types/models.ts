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
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  assigned_manager_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

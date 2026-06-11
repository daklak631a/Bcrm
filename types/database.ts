import type {
  Customer,
  Deposit,
  DepositStatus,
  Interaction,
  InteractionResult,
  InteractionType,
  Loan,
  LoanStatus,
  Notification,
  Plan,
  PlanAssignment,
  Product,
  Profile,
  UserRole,
} from './models'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type ProfileRow = Profile
type CustomerRow = Customer
type LoanRow = Loan
type DepositRow = Deposit
type InteractionRow = Interaction
type PlanRow = Plan
type PlanAssignmentRow = PlanAssignment
type NotificationRow = Notification
type ProductRow = Product

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      customers: {
        Row: CustomerRow
        Insert: Omit<CustomerRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<CustomerRow>
        Relationships: []
      }
      loans: {
        Row: LoanRow
        Insert: Omit<LoanRow, 'id' | 'created_at' | 'updated_at' | 'overdue_days' | 'warning_level'> & {
          id?: string
          created_at?: string
          updated_at?: string
          overdue_days?: number
          warning_level?: string | null
        }
        Update: Partial<LoanRow>
        Relationships: []
      }
      deposits: {
        Row: DepositRow
        Insert: Omit<DepositRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<DepositRow>
        Relationships: []
      }
      interactions: {
        Row: InteractionRow
        Insert: Omit<InteractionRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<InteractionRow>
        Relationships: []
      }
      plans: {
        Row: PlanRow
        Insert: Omit<PlanRow, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<PlanRow>
        Relationships: []
      }
      plan_assignments: {
        Row: PlanAssignmentRow
        Insert: Omit<PlanAssignmentRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<PlanAssignmentRow>
        Relationships: []
      }
      cross_sell_products: {
        Row: ProductRow & { is_active?: boolean | null }
        Insert: {
          id?: string
          name: string
          type: string
          description?: string | null
          target?: number | null
          metric_type?: ProductRow['metric_type']
          unit_label?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['cross_sell_products']['Row']>
        Relationships: []
      }
      cross_sell_records: {
        Row: {
          id: string
          product_id: string
          customer_id: string | null
          agent_id: string
          status: string
          sale_date: string
          result_value: number | null
          note: string | null
          is_batch_entry: boolean | null
          is_allocated: boolean | null
          batch_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          customer_id?: string | null
          agent_id: string
          status?: string
          sale_date?: string
          result_value?: number | null
          note?: string | null
          is_batch_entry?: boolean | null
          is_allocated?: boolean | null
          batch_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['cross_sell_records']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: NotificationRow
        Insert: Omit<NotificationRow, 'id' | 'created_at' | 'is_read'> & {
          id?: string
          created_at?: string
          is_read?: boolean
        }
        Update: Partial<NotificationRow>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string
          before_value: Json | null
          after_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          before_value?: Json | null
          after_value?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
        Relationships: []
      }
      allowed_emails: {
        Row: {
          id: string
          email: string
          full_name: string
          short_name: string | null
          role: UserRole
          department_id: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          short_name?: string | null
          role?: UserRole
          department_id?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['allowed_emails']['Insert']>
        Relationships: []
      }
      support_requests: {
        Row: {
          id: string
          item_id: string
          item_type: string
          requester_id: string
          support_admin_id: string
          status: string
          scheduled_date: string
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          item_type: string
          requester_id: string
          support_admin_id: string
          status?: string
          scheduled_date: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['support_requests']['Insert']>
        Relationships: []
      }
      manager_transfer_requests: {
        Row: {
          id: string
          customer_id: string
          requester_id: string
          target_manager_id: string
          status: string
          reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          requester_id: string
          target_manager_id: string
          status?: string
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['manager_transfer_requests']['Insert']>
        Relationships: []
      }
      role_delegations: {
        Row: {
          id: string
          delegator_id: string | null
          delegatee_id: string | null
          delegated_role: UserRole
          start_date: string
          end_date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          delegator_id?: string | null
          delegatee_id?: string | null
          delegated_role: UserRole
          start_date: string
          end_date: string
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['role_delegations']['Insert']>
        Relationships: []
      }
      system_settings: {
        Row: { key: string; value: string; updated_at: string }
        Insert: { key: string; value: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['system_settings']['Insert']>
        Relationships: []
      }
      daily_manager_snapshots: {
        Row: {
          id: string
          manager_id: string
          snapshot_date: string
          total_short_term_loan_balance: number
          total_medium_term_loan_balance: number
          total_deposit_balance: number
          created_at: string
        }
        Insert: {
          id?: string
          manager_id: string
          snapshot_date?: string
          total_short_term_loan_balance?: number
          total_medium_term_loan_balance?: number
          total_deposit_balance?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['daily_manager_snapshots']['Insert']>
        Relationships: []
      }
      weekly_plans: {
        Row: Record<string, Json>
        Insert: Record<string, Json>
        Update: Record<string, Json>
        Relationships: []
      }
      daily_plans: {
        Row: Record<string, Json>
        Insert: Record<string, Json>
        Update: Record<string, Json>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      interaction_type: InteractionType
      interaction_result: InteractionResult
      loan_status: LoanStatus
      deposit_status: DepositStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

/**
 * AUTO-GENERATED — không sửa tay.
 * Sinh từ schema PostgREST (DB Supabase thật).
 * Chạy lại: npm run gen:types
 * Generated at: 2026-06-11T04:32:07.597Z
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      allowed_emails: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string
          is_active: boolean
          created_at: string
          created_by?: string
          full_name_slug?: string
          short_name?: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string
          is_active?: boolean
          created_at?: string
          created_by?: string
          full_name_slug?: string
          short_name?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string
          is_active?: boolean
          created_at?: string
          created_by?: string
          full_name_slug?: string
          short_name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id?: string
          action: string
          entity_type: string
          entity_id: string
          before_value?: Json
          after_value?: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          action: string
          entity_type: string
          entity_id: string
          before_value?: Json
          after_value?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          before_value?: Json
          after_value?: Json
          created_at?: string
        }
        Relationships: []
      }
      cross_sales: {
        Row: {
          id: string
          customer_id?: string
          manager_id: string
          service_type: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
          amount?: number
          recorded_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string
          manager_id: string
          service_type: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
          amount?: number
          recorded_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          manager_id?: string
          service_type?: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
          amount?: number
          recorded_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cross_sell_products: {
        Row: {
          id: string
          name: string
          type: string
          description?: string
          target?: number
          created_at: string
          updated_at: string
          metric_type: string
          unit_label: string
          is_active?: boolean
        }
        Insert: {
          id?: string
          name: string
          type?: string
          description?: string
          target?: number
          created_at?: string
          updated_at?: string
          metric_type?: string
          unit_label?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          type?: string
          description?: string
          target?: number
          created_at?: string
          updated_at?: string
          metric_type?: string
          unit_label?: string
          is_active?: boolean
        }
        Relationships: []
      }
      cross_sell_records: {
        Row: {
          id: string
          product_id: string
          customer_id?: string
          agent_id: string
          status: string
          sale_date: string
          note?: string
          created_at: string
          updated_at: string
          result_value: number
          is_batch_entry?: boolean
          is_allocated?: boolean
          batch_note?: string
        }
        Insert: {
          id?: string
          product_id: string
          customer_id?: string
          agent_id: string
          status?: string
          sale_date?: string
          note?: string
          created_at?: string
          updated_at?: string
          result_value?: number
          is_batch_entry?: boolean
          is_allocated?: boolean
          batch_note?: string
        }
        Update: {
          id?: string
          product_id?: string
          customer_id?: string
          agent_id?: string
          status?: string
          sale_date?: string
          note?: string
          created_at?: string
          updated_at?: string
          result_value?: number
          is_batch_entry?: boolean
          is_allocated?: boolean
          batch_note?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          phone?: string
          email?: string
          address?: string
          note?: string
          assigned_manager_id?: string
          created_at: string
          updated_at: string
          deleted_at?: string
          customer_type?: string
          business_name?: string
          tax_code?: string
          representative_name?: string
          full_name: string
          loan_short_term?: number
          loan_mid_long_term?: number
          hdv_dau_ky?: number
          hdv_phat_sinh?: number
          hdv_tang_rong?: number
          limit_approval_count?: number
          cif_moi?: boolean
          smart_banking?: boolean
          bao_hiem_nhan_tho?: boolean
          bao_hiem_khoan_vay?: boolean
          the_tin_dung?: boolean
          chuyen_tien_ngoai?: boolean
          merchant_qr?: boolean
          sp_khac?: string
          cif_code?: string
        }
        Insert: {
          id?: string
          phone?: string
          email?: string
          address?: string
          note?: string
          assigned_manager_id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string
          customer_type?: string
          business_name?: string
          tax_code?: string
          representative_name?: string
          full_name: string
          loan_short_term?: number
          loan_mid_long_term?: number
          hdv_dau_ky?: number
          hdv_phat_sinh?: number
          hdv_tang_rong?: number
          limit_approval_count?: number
          cif_moi?: boolean
          smart_banking?: boolean
          bao_hiem_nhan_tho?: boolean
          bao_hiem_khoan_vay?: boolean
          the_tin_dung?: boolean
          chuyen_tien_ngoai?: boolean
          merchant_qr?: boolean
          sp_khac?: string
          cif_code?: string
        }
        Update: {
          id?: string
          phone?: string
          email?: string
          address?: string
          note?: string
          assigned_manager_id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string
          customer_type?: string
          business_name?: string
          tax_code?: string
          representative_name?: string
          full_name?: string
          loan_short_term?: number
          loan_mid_long_term?: number
          hdv_dau_ky?: number
          hdv_phat_sinh?: number
          hdv_tang_rong?: number
          limit_approval_count?: number
          cif_moi?: boolean
          smart_banking?: boolean
          bao_hiem_nhan_tho?: boolean
          bao_hiem_khoan_vay?: boolean
          the_tin_dung?: boolean
          chuyen_tien_ngoai?: boolean
          merchant_qr?: boolean
          sp_khac?: string
          cif_code?: string
        }
        Relationships: []
      }
      daily_manager_snapshots: {
        Row: {
          id: string
          manager_id: string
          snapshot_date: string
          total_short_term_loan_balance?: number
          total_medium_term_loan_balance?: number
          total_deposit_balance?: number
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
        Update: {
          id?: string
          manager_id?: string
          snapshot_date?: string
          total_short_term_loan_balance?: number
          total_medium_term_loan_balance?: number
          total_deposit_balance?: number
          created_at?: string
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          id: string
          user_id: string
          target_date: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          created_at?: string
          updated_at?: string
          product_targets?: Json
        }
        Insert: {
          id?: string
          user_id: string
          target_date: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          created_at?: string
          updated_at?: string
          product_targets?: Json
        }
        Update: {
          id?: string
          user_id?: string
          target_date?: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          created_at?: string
          updated_at?: string
          product_targets?: Json
        }
        Relationships: []
      }
      deposits: {
        Row: {
          id: string
          customer_id: string
          account_number: string
          amount: number
          start_date: string
          maturity_date: string
          status: 'ACTIVE' | 'CLOSED' | 'MATURED' | 'PENDING'
          created_at: string
          updated_at: string
          deposit_type?: string
        }
        Insert: {
          id?: string
          customer_id: string
          account_number: string
          amount: number
          start_date: string
          maturity_date: string
          status?: 'ACTIVE' | 'CLOSED' | 'MATURED' | 'PENDING'
          created_at?: string
          updated_at?: string
          deposit_type?: string
        }
        Update: {
          id?: string
          customer_id?: string
          account_number?: string
          amount?: number
          start_date?: string
          maturity_date?: string
          status?: 'ACTIVE' | 'CLOSED' | 'MATURED' | 'PENDING'
          created_at?: string
          updated_at?: string
          deposit_type?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          id: string
          customer_id: string
          manager_id: string
          type: 'CALL' | 'MEETING' | 'SMS' | 'EMAIL' | 'VISIT'
          purpose: string
          result: 'SUCCESS' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'PENDING'
          notes?: string
          completion_status: boolean
          interaction_date: string
          follow_up_date?: string
          next_action?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          manager_id: string
          type: 'CALL' | 'MEETING' | 'SMS' | 'EMAIL' | 'VISIT'
          purpose: string
          result?: 'SUCCESS' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'PENDING'
          notes?: string
          completion_status?: boolean
          interaction_date?: string
          follow_up_date?: string
          next_action?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          manager_id?: string
          type?: 'CALL' | 'MEETING' | 'SMS' | 'EMAIL' | 'VISIT'
          purpose?: string
          result?: 'SUCCESS' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'PENDING'
          notes?: string
          completion_status?: boolean
          interaction_date?: string
          follow_up_date?: string
          next_action?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_target_configs: {
        Row: {
          id: string
          metric_key: string
          metric_label: string
          target_value?: number
          unit?: string
          period?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          metric_key: string
          metric_label: string
          target_value?: number
          unit?: string
          period?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          metric_key?: string
          metric_label?: string
          target_value?: number
          unit?: string
          period?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          id: string
          customer_id: string
          account_number: string
          loan_amount: number
          balance: number
          start_date: string
          due_date?: string
          status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
          overdue_days: number
          warning_level?: string
          created_at: string
          updated_at: string
          term_type?: 'SHORT_TERM' | 'MEDIUM_LONG_TERM'
          business_sector?: string
          disbursement_purpose?: string
          collateral_assets?: string
          credit_limit?: number
          loan_method?: string
          loan_type?: string
          interest_rate?: number
        }
        Insert: {
          id?: string
          customer_id: string
          account_number: string
          loan_amount: number
          balance: number
          start_date: string
          due_date?: string
          status?: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
          overdue_days?: number
          warning_level?: string
          created_at?: string
          updated_at?: string
          term_type?: 'SHORT_TERM' | 'MEDIUM_LONG_TERM'
          business_sector?: string
          disbursement_purpose?: string
          collateral_assets?: string
          credit_limit?: number
          loan_method?: string
          loan_type?: string
          interest_rate?: number
        }
        Update: {
          id?: string
          customer_id?: string
          account_number?: string
          loan_amount?: number
          balance?: number
          start_date?: string
          due_date?: string
          status?: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
          overdue_days?: number
          warning_level?: string
          created_at?: string
          updated_at?: string
          term_type?: 'SHORT_TERM' | 'MEDIUM_LONG_TERM'
          business_sector?: string
          disbursement_purpose?: string
          collateral_assets?: string
          credit_limit?: number
          loan_method?: string
          loan_type?: string
          interest_rate?: number
        }
        Relationships: []
      }
      manager_transfer_requests: {
        Row: {
          id: string
          customer_id: string
          requester_id: string
          target_manager_id: string
          status: string
          reason?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          requester_id: string
          target_manager_id: string
          status?: string
          reason?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          requester_id?: string
          target_manager_id?: string
          status?: string
          reason?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          link_url?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          link_url?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          link_url?: string
          created_at?: string
        }
        Relationships: []
      }
      plan_assignments: {
        Row: {
          id: string
          plan_id: string
          user_id: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          actual_loans_amount?: number
          actual_deposits_amount?: number
          actual_calls?: number
          created_at: string
          updated_at: string
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          product_targets?: Json
        }
        Insert: {
          id?: string
          plan_id: string
          user_id: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          actual_loans_amount?: number
          actual_deposits_amount?: number
          actual_calls?: number
          created_at?: string
          updated_at?: string
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          product_targets?: Json
        }
        Update: {
          id?: string
          plan_id?: string
          user_id?: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          actual_loans_amount?: number
          actual_deposits_amount?: number
          actual_calls?: number
          created_at?: string
          updated_at?: string
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          product_targets?: Json
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          title: string
          description?: string
          target_date: string
          created_by?: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          target_date: string
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          target_date?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string
          created_at: string
          updated_at: string
          is_active: boolean
          full_name_slug?: string
          short_name?: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          full_name_slug?: string
          short_name?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
          full_name_slug?: string
          short_name?: string
        }
        Relationships: []
      }
      role_delegations: {
        Row: {
          id: string
          delegator_id?: string
          delegatee_id?: string
          delegated_role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          start_date: string
          end_date: string
          status?: string
          created_at?: string
        }
        Insert: {
          id?: string
          delegator_id?: string
          delegatee_id?: string
          delegated_role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          start_date: string
          end_date: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          delegator_id?: string
          delegatee_id?: string
          delegated_role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          start_date?: string
          end_date?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          id: string
          item_id: string
          item_type: string
          requester_id?: string
          support_admin_id?: string
          status?: string
          scheduled_date: string
          created_at?: string
        }
        Insert: {
          id?: string
          item_id: string
          item_type: string
          requester_id?: string
          support_admin_id?: string
          status?: string
          scheduled_date: string
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          item_type?: string
          requester_id?: string
          support_admin_id?: string
          status?: string
          scheduled_date?: string
          created_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: string
          updated_at?: string
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          created_at?: string
          updated_at?: string
          product_targets?: Json
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          created_at?: string
          updated_at?: string
          product_targets?: Json
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          target_loans_amount?: number
          target_deposits_amount?: number
          target_calls?: number
          target_cif_moi?: number
          target_bidv_direct?: number
          target_bh_nhan_tho?: number
          target_bh_khoan_vay?: number
          target_huy_dong_tang_rong?: number
          target_du_no_ngan_han_tang_rong?: number
          target_du_no_trung_han_tang_rong?: number
          target_cap_moi_hmtd?: number
          created_at?: string
          updated_at?: string
          product_targets?: Json
        }
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
      cross_sale_service: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
      deposit_status: 'ACTIVE' | 'CLOSED' | 'MATURED' | 'PENDING'
      interaction_result: 'SUCCESS' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'PENDING'
      interaction_type: 'CALL' | 'MEETING' | 'SMS' | 'EMAIL' | 'VISIT'
      loan_status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
      loan_term_type: 'SHORT_TERM' | 'MEDIUM_LONG_TERM'
      user_role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
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

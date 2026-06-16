/**
 * AUTO-GENERATED — không sửa tay.
 * Sinh từ schema PostgREST (DB Supabase thật).
 * Chạy lại: npm run gen:types
 * Generated at: 2026-06-15T09:48:44.769Z
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
          department_id: string | null
          is_active: boolean
          created_at: string
          created_by: string | null
          full_name_slug: string | null
          short_name: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          full_name_slug?: string | null
          short_name?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string | null
          is_active?: boolean
          created_at?: string
          created_by?: string | null
          full_name_slug?: string | null
          short_name?: string | null
        }
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
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          before_value?: Json | null
          after_value?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cross_sales: {
        Row: {
          id: string
          customer_id: string | null
          manager_id: string
          service_type: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
          amount: number | null
          recorded_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          manager_id: string
          service_type: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
          amount?: number | null
          recorded_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          manager_id?: string
          service_type?: 'BIDV_DIRECT' | 'LIFE_INSURANCE' | 'LOAN_INSURANCE' | 'CREDIT_LIMIT_NEW'
          amount?: number | null
          recorded_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sales_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cross_sell_products: {
        Row: {
          id: string
          name: string
          type: string
          description: string | null
          target: number | null
          created_at: string
          updated_at: string
          metric_type: string
          unit_label: string
          is_active: boolean | null
          short_name: string | null
          kpi_category: string | null
        }
        Insert: {
          id?: string
          name: string
          type?: string
          description?: string | null
          target?: number | null
          created_at?: string
          updated_at?: string
          metric_type?: string
          unit_label?: string
          is_active?: boolean | null
          short_name?: string | null
          kpi_category?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          description?: string | null
          target?: number | null
          created_at?: string
          updated_at?: string
          metric_type?: string
          unit_label?: string
          is_active?: boolean | null
          short_name?: string | null
          kpi_category?: string | null
        }
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
          note: string | null
          created_at: string
          updated_at: string
          result_value: number
          is_batch_entry: boolean | null
          is_allocated: boolean | null
          batch_note: string | null
        }
        Insert: {
          id?: string
          product_id: string
          customer_id?: string | null
          agent_id: string
          status?: string
          sale_date?: string
          note?: string | null
          created_at?: string
          updated_at?: string
          result_value?: number
          is_batch_entry?: boolean | null
          is_allocated?: boolean | null
          batch_note?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          customer_id?: string | null
          agent_id?: string
          status?: string
          sale_date?: string
          note?: string | null
          created_at?: string
          updated_at?: string
          result_value?: number
          is_batch_entry?: boolean | null
          is_allocated?: boolean | null
          batch_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_sell_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cross_sell_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_sell_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          address: string | null
          note: string | null
          assigned_manager_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          customer_type: string | null
          business_name: string | null
          tax_code: string | null
          representative_name: string | null
          full_name: string
          loan_short_term: number | null
          loan_mid_long_term: number | null
          hdv_dau_ky: number | null
          hdv_phat_sinh: number | null
          hdv_tang_rong: number | null
          limit_approval_count: number | null
          cif_moi: boolean | null
          smart_banking: boolean | null
          bao_hiem_nhan_tho: boolean | null
          bao_hiem_khoan_vay: boolean | null
          the_tin_dung: boolean | null
          chuyen_tien_ngoai: boolean | null
          merchant_qr: boolean | null
          sp_khac: string | null
          cif_code: string | null
          department_id: string | null
        }
        Insert: {
          id?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          note?: string | null
          assigned_manager_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          customer_type?: string | null
          business_name?: string | null
          tax_code?: string | null
          representative_name?: string | null
          full_name: string
          loan_short_term?: number | null
          loan_mid_long_term?: number | null
          hdv_dau_ky?: number | null
          hdv_phat_sinh?: number | null
          hdv_tang_rong?: number | null
          limit_approval_count?: number | null
          cif_moi?: boolean | null
          smart_banking?: boolean | null
          bao_hiem_nhan_tho?: boolean | null
          bao_hiem_khoan_vay?: boolean | null
          the_tin_dung?: boolean | null
          chuyen_tien_ngoai?: boolean | null
          merchant_qr?: boolean | null
          sp_khac?: string | null
          cif_code?: string | null
          department_id?: string | null
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          note?: string | null
          assigned_manager_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          customer_type?: string | null
          business_name?: string | null
          tax_code?: string | null
          representative_name?: string | null
          full_name?: string
          loan_short_term?: number | null
          loan_mid_long_term?: number | null
          hdv_dau_ky?: number | null
          hdv_phat_sinh?: number | null
          hdv_tang_rong?: number | null
          limit_approval_count?: number | null
          cif_moi?: boolean | null
          smart_banking?: boolean | null
          bao_hiem_nhan_tho?: boolean | null
          bao_hiem_khoan_vay?: boolean | null
          the_tin_dung?: boolean | null
          chuyen_tien_ngoai?: boolean | null
          merchant_qr?: boolean | null
          sp_khac?: string | null
          cif_code?: string | null
          department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_manager_id_fkey"
            columns: ["assigned_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_manager_snapshots: {
        Row: {
          id: string
          manager_id: string
          snapshot_date: string
          total_short_term_loan_balance: number | null
          total_medium_term_loan_balance: number | null
          total_deposit_balance: number | null
          created_at: string
        }
        Insert: {
          id?: string
          manager_id: string
          snapshot_date?: string
          total_short_term_loan_balance?: number | null
          total_medium_term_loan_balance?: number | null
          total_deposit_balance?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          manager_id?: string
          snapshot_date?: string
          total_short_term_loan_balance?: number | null
          total_medium_term_loan_balance?: number | null
          total_deposit_balance?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_manager_snapshots_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_plans: {
        Row: {
          id: string
          user_id: string
          target_date: string
          target_loans_amount: number | null
          target_deposits_amount: number | null
          target_calls: number | null
          target_cif_moi: number | null
          target_bidv_direct: number | null
          target_bh_nhan_tho: number | null
          target_bh_khoan_vay: number | null
          target_huy_dong_tang_rong: number | null
          target_du_no_ngan_han_tang_rong: number | null
          target_du_no_trung_han_tang_rong: number | null
          target_cap_moi_hmtd: number | null
          created_at: string | null
          updated_at: string | null
          product_targets: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          target_date: string
          target_loans_amount?: number | null
          target_deposits_amount?: number | null
          target_calls?: number | null
          target_cif_moi?: number | null
          target_bidv_direct?: number | null
          target_bh_nhan_tho?: number | null
          target_bh_khoan_vay?: number | null
          target_huy_dong_tang_rong?: number | null
          target_du_no_ngan_han_tang_rong?: number | null
          target_du_no_trung_han_tang_rong?: number | null
          target_cap_moi_hmtd?: number | null
          created_at?: string | null
          updated_at?: string | null
          product_targets?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          target_date?: string
          target_loans_amount?: number | null
          target_deposits_amount?: number | null
          target_calls?: number | null
          target_cif_moi?: number | null
          target_bidv_direct?: number | null
          target_bh_nhan_tho?: number | null
          target_bh_khoan_vay?: number | null
          target_huy_dong_tang_rong?: number | null
          target_du_no_ngan_han_tang_rong?: number | null
          target_du_no_trung_han_tang_rong?: number | null
          target_cap_moi_hmtd?: number | null
          created_at?: string | null
          updated_at?: string | null
          product_targets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      departments: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
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
          deposit_type: string | null
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
          deposit_type?: string | null
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
          deposit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      interactions: {
        Row: {
          id: string
          customer_id: string
          manager_id: string
          type: 'CALL' | 'MEETING' | 'SMS' | 'EMAIL' | 'VISIT'
          purpose: string
          result: 'SUCCESS' | 'NO_ANSWER' | 'FOLLOW_UP' | 'NOT_INTERESTED' | 'PENDING'
          notes: string | null
          completion_status: boolean
          interaction_date: string
          follow_up_date: string | null
          next_action: string | null
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
          notes?: string | null
          completion_status?: boolean
          interaction_date?: string
          follow_up_date?: string | null
          next_action?: string | null
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
          notes?: string | null
          completion_status?: boolean
          interaction_date?: string
          follow_up_date?: string | null
          next_action?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      kpi_target_configs: {
        Row: {
          id: string
          metric_key: string
          metric_label: string
          target_value: number | null
          unit: string | null
          period: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          metric_key: string
          metric_label: string
          target_value?: number | null
          unit?: string | null
          period?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          metric_key?: string
          metric_label?: string
          target_value?: number | null
          unit?: string | null
          period?: string | null
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
          due_date: string | null
          status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
          overdue_days: number
          warning_level: string | null
          created_at: string
          updated_at: string
          term_type: 'SHORT_TERM' | 'MEDIUM_LONG_TERM' | null
          business_sector: string | null
          disbursement_purpose: string | null
          collateral_assets: string | null
          credit_limit: number | null
          loan_method: string | null
          loan_type: string | null
          interest_rate: number | null
        }
        Insert: {
          id?: string
          customer_id: string
          account_number: string
          loan_amount: number
          balance: number
          start_date: string
          due_date?: string | null
          status?: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
          overdue_days?: number
          warning_level?: string | null
          created_at?: string
          updated_at?: string
          term_type?: 'SHORT_TERM' | 'MEDIUM_LONG_TERM' | null
          business_sector?: string | null
          disbursement_purpose?: string | null
          collateral_assets?: string | null
          credit_limit?: number | null
          loan_method?: string | null
          loan_type?: string | null
          interest_rate?: number | null
        }
        Update: {
          id?: string
          customer_id?: string
          account_number?: string
          loan_amount?: number
          balance?: number
          start_date?: string
          due_date?: string | null
          status?: 'ACTIVE' | 'CLOSED' | 'DEFAULTED' | 'PENDING'
          overdue_days?: number
          warning_level?: string | null
          created_at?: string
          updated_at?: string
          term_type?: 'SHORT_TERM' | 'MEDIUM_LONG_TERM' | null
          business_sector?: string | null
          disbursement_purpose?: string | null
          collateral_assets?: string | null
          credit_limit?: number | null
          loan_method?: string | null
          loan_type?: string | null
          interest_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
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
        Update: {
          id?: string
          customer_id?: string
          requester_id?: string
          target_manager_id?: string
          status?: string
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_transfer_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_transfer_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_transfer_requests_target_manager_id_fkey"
            columns: ["target_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          link_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          link_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          link_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      plan_assignments: {
        Row: {
          id: string
          plan_id: string
          user_id: string
          target_loans_amount: number | null
          target_deposits_amount: number | null
          target_calls: number | null
          actual_loans_amount: number | null
          actual_deposits_amount: number | null
          actual_calls: number | null
          created_at: string
          updated_at: string
          target_cif_moi: number | null
          target_bidv_direct: number | null
          target_bh_nhan_tho: number | null
          target_bh_khoan_vay: number | null
          target_huy_dong_tang_rong: number | null
          target_du_no_ngan_han_tang_rong: number | null
          target_du_no_trung_han_tang_rong: number | null
          target_cap_moi_hmtd: number | null
          product_targets: Json | null
        }
        Insert: {
          id?: string
          plan_id: string
          user_id: string
          target_loans_amount?: number | null
          target_deposits_amount?: number | null
          target_calls?: number | null
          actual_loans_amount?: number | null
          actual_deposits_amount?: number | null
          actual_calls?: number | null
          created_at?: string
          updated_at?: string
          target_cif_moi?: number | null
          target_bidv_direct?: number | null
          target_bh_nhan_tho?: number | null
          target_bh_khoan_vay?: number | null
          target_huy_dong_tang_rong?: number | null
          target_du_no_ngan_han_tang_rong?: number | null
          target_du_no_trung_han_tang_rong?: number | null
          target_cap_moi_hmtd?: number | null
          product_targets?: Json | null
        }
        Update: {
          id?: string
          plan_id?: string
          user_id?: string
          target_loans_amount?: number | null
          target_deposits_amount?: number | null
          target_calls?: number | null
          actual_loans_amount?: number | null
          actual_deposits_amount?: number | null
          actual_calls?: number | null
          created_at?: string
          updated_at?: string
          target_cif_moi?: number | null
          target_bidv_direct?: number | null
          target_bh_nhan_tho?: number | null
          target_bh_khoan_vay?: number | null
          target_huy_dong_tang_rong?: number | null
          target_du_no_ngan_han_tang_rong?: number | null
          target_du_no_trung_han_tang_rong?: number | null
          target_cap_moi_hmtd?: number | null
          product_targets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          title: string
          description: string | null
          target_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          target_date: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          target_date?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id: string | null
          created_at: string
          updated_at: string
          is_active: boolean
          full_name_slug: string | null
          short_name: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          full_name_slug?: string | null
          short_name?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          department_id?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          full_name_slug?: string | null
          short_name?: string | null
        }
        Relationships: []
      }
      role_delegations: {
        Row: {
          id: string
          delegator_id: string | null
          delegatee_id: string | null
          delegated_role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          start_date: string
          end_date: string
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          delegator_id?: string | null
          delegatee_id?: string | null
          delegated_role: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          start_date: string
          end_date: string
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          delegator_id?: string | null
          delegatee_id?: string | null
          delegated_role?: 'USER' | 'ADMIN_LEVEL_2' | 'ADMIN_LEVEL_1' | 'ADMIN_LEVEL_3' | 'ADVISOR' | 'ADMIN_LEVEL_0'
          start_date?: string
          end_date?: string
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_delegations_delegator_id_fkey"
            columns: ["delegator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_delegations_delegatee_id_fkey"
            columns: ["delegatee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      support_requests: {
        Row: {
          id: string
          item_id: string
          item_type: string
          requester_id: string | null
          support_admin_id: string | null
          status: string | null
          scheduled_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          item_type: string
          requester_id?: string | null
          support_admin_id?: string | null
          status?: string | null
          scheduled_date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          item_type?: string
          requester_id?: string | null
          support_admin_id?: string | null
          status?: string | null
          scheduled_date?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_requests_support_admin_id_fkey"
            columns: ["support_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      system_settings: {
        Row: {
          key: string
          value: string
          updated_at: string | null
        }
        Insert: {
          key: string
          value: string
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      weekly_plans: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          target_loans_amount: number | null
          target_deposits_amount: number | null
          target_calls: number | null
          target_cif_moi: number | null
          target_bidv_direct: number | null
          target_bh_nhan_tho: number | null
          target_bh_khoan_vay: number | null
          target_huy_dong_tang_rong: number | null
          target_du_no_ngan_han_tang_rong: number | null
          target_du_no_trung_han_tang_rong: number | null
          target_cap_moi_hmtd: number | null
          created_at: string | null
          updated_at: string | null
          product_targets: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          target_loans_amount?: number | null
          target_deposits_amount?: number | null
          target_calls?: number | null
          target_cif_moi?: number | null
          target_bidv_direct?: number | null
          target_bh_nhan_tho?: number | null
          target_bh_khoan_vay?: number | null
          target_huy_dong_tang_rong?: number | null
          target_du_no_ngan_han_tang_rong?: number | null
          target_du_no_trung_han_tang_rong?: number | null
          target_cap_moi_hmtd?: number | null
          created_at?: string | null
          updated_at?: string | null
          product_targets?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          target_loans_amount?: number | null
          target_deposits_amount?: number | null
          target_calls?: number | null
          target_cif_moi?: number | null
          target_bidv_direct?: number | null
          target_bh_nhan_tho?: number | null
          target_bh_khoan_vay?: number | null
          target_huy_dong_tang_rong?: number | null
          target_du_no_ngan_han_tang_rong?: number | null
          target_du_no_trung_han_tang_rong?: number | null
          target_cap_moi_hmtd?: number | null
          created_at?: string | null
          updated_at?: string | null
          product_targets?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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

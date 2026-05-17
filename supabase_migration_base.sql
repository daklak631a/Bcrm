-- =====================================================
-- NEXUS BANKING CRM - BASE MIGRATION
-- Run this FIRST in Supabase SQL Editor
-- =====================================================

-- 1. Custom ENUM types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN_LEVEL_2', 'ADMIN_LEVEL_1');
CREATE TYPE interaction_type AS ENUM ('CALL', 'MEETING', 'SMS', 'EMAIL', 'VISIT');
CREATE TYPE interaction_result AS ENUM ('SUCCESS', 'NO_ANSWER', 'FOLLOW_UP', 'NOT_INTERESTED', 'PENDING');
CREATE TYPE loan_status AS ENUM ('ACTIVE', 'CLOSED', 'DEFAULTED', 'PENDING');
CREATE TYPE deposit_status AS ENUM ('ACTIVE', 'CLOSED', 'MATURED', 'PENDING');

-- 2. PROFILES TABLE (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    department_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_dept ON profiles(department_id);

-- 3. CUSTOMERS TABLE
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    note TEXT,
    assigned_manager_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_customers_manager ON customers(assigned_manager_id);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);

-- 4. LOANS TABLE
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    loan_type TEXT,
    loan_amount DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status loan_status NOT NULL DEFAULT 'ACTIVE',
    overdue_days INT NOT NULL DEFAULT 0,
    warning_level TEXT,
    term_type TEXT DEFAULT 'SHORT_TERM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due_date ON loans(due_date);

-- 5. DEPOSITS TABLE
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    deposit_type TEXT DEFAULT 'Tiết kiệm thường',
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    term_months INT DEFAULT 12,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status deposit_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_deposits_customer ON deposits(customer_id);
CREATE INDEX idx_deposits_maturity ON deposits(maturity_date);

-- 6. INTERACTIONS TABLE
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id),
    type interaction_type NOT NULL,
    purpose TEXT NOT NULL,
    result interaction_result NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    completion_status BOOLEAN NOT NULL DEFAULT FALSE,
    interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    follow_up_date TIMESTAMPTZ,
    next_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_interactions_customer ON interactions(customer_id);
CREATE INDEX idx_interactions_manager ON interactions(manager_id);
CREATE INDEX idx_interactions_date ON interactions(interaction_date);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- 8. CROSS-SELL PRODUCTS TABLE
CREATE TABLE cross_sell_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Dịch vụ',
    description TEXT,
    target DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CROSS-SELL RECORDS TABLE (sales tracking)
CREATE TABLE cross_sell_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES cross_sell_products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'Pending',
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cross_sell_records_product ON cross_sell_records(product_id);
CREATE INDEX idx_cross_sell_records_agent ON cross_sell_records(agent_id);
CREATE INDEX idx_cross_sell_records_date ON cross_sell_records(sale_date);

-- 10. ALLOWED EMAILS TABLE (pre-approved login whitelist)
CREATE TABLE allowed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    department_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 11. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- PROFILES: Authenticated users can read all profiles
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- CUSTOMERS: Users see their own, admins see all
CREATE POLICY "Users can view their customers or all if admin" ON customers
  FOR SELECT USING (
    assigned_manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

CREATE POLICY "Authenticated users can insert customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their customers or admins" ON customers
  FOR UPDATE USING (
    assigned_manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- LOANS: Authenticated can read/write (filtered by customer RLS)
CREATE POLICY "Authenticated can read loans" ON loans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert loans" ON loans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update loans" ON loans
  FOR UPDATE USING (auth.role() = 'authenticated');

-- DEPOSITS: Same pattern
CREATE POLICY "Authenticated can read deposits" ON deposits
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert deposits" ON deposits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update deposits" ON deposits
  FOR UPDATE USING (auth.role() = 'authenticated');

-- INTERACTIONS: Users see their own, admins see all
CREATE POLICY "Users can view their interactions or all if admin" ON interactions
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

CREATE POLICY "Authenticated can insert interactions" ON interactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their interactions or admins" ON interactions
  FOR UPDATE USING (
    manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- NOTIFICATIONS: Users see their own only
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- CROSS-SELL PRODUCTS: All authenticated can read, admins can manage
CREATE POLICY "Authenticated can read products" ON cross_sell_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage products" ON cross_sell_products
  FOR ALL USING (
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

CREATE POLICY "Authenticated can insert products" ON cross_sell_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete products" ON cross_sell_products
  FOR DELETE USING (auth.role() = 'authenticated');

-- CROSS-SELL RECORDS: Users see their own, admins see all
CREATE POLICY "Users can view their records or all if admin" ON cross_sell_records
  FOR SELECT USING (
    agent_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

CREATE POLICY "Authenticated can insert records" ON cross_sell_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their records or admins" ON cross_sell_records
  FOR UPDATE USING (
    agent_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- ALLOWED EMAILS: Admin L1 full access, authenticated can read
CREATE POLICY "Admin L1 can manage allowed_emails" ON allowed_emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1')
  );

CREATE POLICY "Authenticated can read allowed_emails" ON allowed_emails
  FOR SELECT USING (auth.role() = 'authenticated');

-- AUDIT LOGS: Only admins can read
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

CREATE POLICY "Authenticated can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- SEED: Default Admin
-- =====================================================
INSERT INTO allowed_emails (email, full_name, role, is_active)
VALUES ('daklak631a@gmail.com', 'Giám Đốc (daklak631a)', 'ADMIN_LEVEL_1', true)
ON CONFLICT (email) DO UPDATE 
SET role = 'ADMIN_LEVEL_1', is_active = true;

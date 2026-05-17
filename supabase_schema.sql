-- Create custom ENUM types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN_LEVEL_2', 'ADMIN_LEVEL_1');
CREATE TYPE interaction_type AS ENUM ('CALL', 'MEETING', 'SMS', 'EMAIL', 'VISIT');
CREATE TYPE interaction_result AS ENUM ('SUCCESS', 'NO_ANSWER', 'FOLLOW_UP', 'NOT_INTERESTED', 'PENDING');
CREATE TYPE loan_status AS ENUM ('ACTIVE', 'CLOSED', 'DEFAULTED', 'PENDING');
CREATE TYPE deposit_status AS ENUM ('ACTIVE', 'CLOSED', 'MATURED', 'PENDING');

-- 1. EXTEND USERS TABLE (Assuming Supabase Auth handles the base user in auth.users)
-- We will create a public.profiles table that links to auth.users using a foreign key
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    department_id UUID, -- For ADMIN_LEVEL_2 scoping
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_dept ON profiles(department_id);

-- 2. CUSTOMERS TABLE
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    note TEXT,
    assigned_manager_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- For soft delete
);
CREATE INDEX idx_customers_manager ON customers(assigned_manager_id);
CREATE INDEX idx_customers_name ON customers(full_name);

-- 3. LOANS TABLE
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    loan_amount DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status loan_status NOT NULL DEFAULT 'ACTIVE',
    overdue_days INT NOT NULL DEFAULT 0,
    warning_level TEXT, -- e.g., 'LOW', 'MEDIUM', 'HIGH'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due_date ON loans(due_date);

-- 4. DEPOSITS TABLE
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status deposit_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_deposits_customer ON deposits(customer_id);
CREATE INDEX idx_deposits_maturity ON deposits(maturity_date);

-- 5. INTERACTIONS TABLE
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

-- 6. PLANS TABLE (KPI Planning)
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PLAN_ASSIGNMENTS TABLE
CREATE TABLE plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_loans_amount DECIMAL(15, 2) DEFAULT 0,
    target_deposits_amount DECIMAL(15, 2) DEFAULT 0,
    target_calls INT DEFAULT 0,
    actual_loans_amount DECIMAL(15, 2) DEFAULT 0,
    actual_deposits_amount DECIMAL(15, 2) DEFAULT 0,
    actual_calls INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, user_id)
);

-- 8. AUDIT_LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- e.g., 'CUSTOMER', 'LOAN', 'INTERACTION'
    entity_id UUID NOT NULL,
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'LOAN_DUE', 'FOLLOW_UP', 'KPI_REMINDER'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: RLS implementation depends on the exact auth flow.
-- Example for Customers: Users can see their own customers, ADMIN_1 can see all, ADMIN_2 can see department.
-- Here we'll create a simple function to get current user role.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Example Customer Policy
CREATE POLICY "Users can view their own customers or all if admin" ON customers
    FOR SELECT USING (
        assigned_manager_id = auth.uid() OR 
        get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
    );

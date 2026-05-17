-- Migration to create manager transfer requests table and setup RLS + Triggers
CREATE TABLE IF NOT EXISTS public.manager_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.manager_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS select_transfer_requests ON public.manager_transfer_requests;
DROP POLICY IF EXISTS insert_transfer_requests ON public.manager_transfer_requests;
DROP POLICY IF EXISTS update_transfer_requests ON public.manager_transfer_requests;

-- 1. SELECT Policy: Requester, Target Manager, or Admins can view
CREATE POLICY select_transfer_requests ON public.manager_transfer_requests
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_manager_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'ADMIN_LEVEL_1' OR role = 'ADMIN_LEVEL_2')
    )
  );

-- 2. INSERT Policy: Chuyên viên thường (requester) có thể tạo yêu cầu cho khách hàng mà mình đang quản lý
CREATE POLICY insert_transfer_requests ON public.manager_transfer_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id AND
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_id AND assigned_manager_id = auth.uid()
    )
  );

-- 3. UPDATE Policy: Chỉ Admin mới được quyền cập nhật trạng thái yêu cầu
CREATE POLICY update_transfer_requests ON public.manager_transfer_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'ADMIN_LEVEL_1' OR role = 'ADMIN_LEVEL_2')
    )
  );

-- 4. Trigger to automatically update customer manager on APPROVAL
CREATE OR REPLACE FUNCTION public.handle_manager_transfer_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' THEN
    UPDATE public.customers
    SET assigned_manager_id = NEW.target_manager_id,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_manager_transfer_approval ON public.manager_transfer_requests;

CREATE TRIGGER on_manager_transfer_approval
  AFTER UPDATE ON public.manager_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_manager_transfer_approval();

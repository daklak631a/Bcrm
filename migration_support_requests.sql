-- Create support_requests table
CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  requester_id UUID REFERENCES public.profiles(id),
  support_admin_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'PENDING', -- PENDING, ACCEPTED, COMPLETED, REJECTED
  scheduled_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: viewable by authenticated users
DROP POLICY IF EXISTS "Support requests viewable by all" ON public.support_requests;
CREATE POLICY "Support requests viewable by all" ON public.support_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: insertable by users
DROP POLICY IF EXISTS "Support requests insertable by users" ON public.support_requests;
CREATE POLICY "Support requests insertable by users" ON public.support_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Policy 3: updatable by requester or support admin
DROP POLICY IF EXISTS "Support requests updatable by requester or admin" ON public.support_requests;
CREATE POLICY "Support requests updatable by requester or admin" ON public.support_requests
  FOR UPDATE USING (
    auth.uid() = requester_id OR auth.uid() = support_admin_id
  );

-- ==============================================================================
-- Function: Nhận phụ trách khách hàng an toàn (Chống xung đột đa luồng)
-- Date: 2026-06-05
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.claim_customer(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_current_user_id UUID;
BEGIN
  -- Lấy ID của user đang gọi API
  v_current_user_id := (SELECT auth.uid());
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bạn chưa đăng nhập.');
  END IF;

  -- 1. BẮT ĐẦU LOCK DỮ LIỆU (ROW-LEVEL LOCK)
  SELECT * INTO v_customer 
  FROM public.customers 
  WHERE id = p_customer_id
  FOR UPDATE; 

  -- Nếu khách hàng không tồn tại
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Khách hàng không tồn tại.');
  END IF;

  -- 2. KIỂM TRA ĐIỀU KIỆN SAU KHI ĐÃ LOCK
  IF v_customer.assigned_manager_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Khách hàng này vừa bị người khác nhận trước!');
  END IF;

  -- 3. CẬP NHẬT DỮ LIỆU
  UPDATE public.customers
  SET 
    assigned_manager_id = v_current_user_id,
    updated_at = NOW()
  WHERE id = p_customer_id;

  -- 4. GHI LOG SỰ KIỆN
  INSERT INTO public.interactions (customer_id, user_id, interaction_type, content)
  VALUES (p_customer_id, v_current_user_id, 'SYSTEM', 'Đã phân công cán bộ phụ trách mới qua hàm an toàn đa luồng.');

  -- 5. TRẢ VỀ KẾT QUẢ
  RETURN jsonb_build_object('success', true, 'message', 'Nhận khách hàng thành công!');
END;
$$;

-- Thu hồi quyền chạy từ Public và chỉ cấp cho tài khoản đã đăng nhập
REVOKE EXECUTE ON FUNCTION public.claim_customer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_customer(UUID) TO authenticated;

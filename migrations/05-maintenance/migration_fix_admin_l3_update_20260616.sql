-- Fix: ADMIN_LEVEL_3 không update được customers (và loans/deposits/interactions)
-- dù frontend coi L3 là admin (thấy nút Nhập/Xuất, nút bật/tắt sản phẩm).
--
-- Nguyên nhân: RLS policy "customers_update_assigned" cho phép UPDATE khi
--   assigned_manager_id = auth.uid() OR is_admin()
-- nhưng is_admin() chỉ trả TRUE cho ADMIN_LEVEL_1/2 (L3 chỉ khi có ủy quyền active).
-- Vì vậy admin L3 thao tác trên KH của người khác -> UPDATE chạm 0 dòng ->
-- PostgREST .single() ném lỗi PGRST116 "Cannot coerce the result to a single JSON object".
--
-- Giải pháp: is_admin() công nhận đầy đủ các cấp admin (L0, L1, L2, L3),
-- đồng bộ với định nghĩa isAdmin ở frontend. Vẫn dùng get_current_user_role()
-- nên L3 có ủy quyền vẫn nhận đúng quyền được ủy quyền.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() IN (
    'ADMIN_LEVEL_0',
    'ADMIN_LEVEL_1',
    'ADMIN_LEVEL_2',
    'ADMIN_LEVEL_3'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

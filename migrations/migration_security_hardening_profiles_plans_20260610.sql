-- ==========================================
-- SECURITY HARDENING 2026-06-10
-- 1. Chặn user thường tự đổi role / is_active / department_id / email trên profiles
--    (vá lỗ hổng leo thang quyền qua policy "profiles_update_own")
-- 2. Thêm policy cho admin cập nhật profiles (phục vụ trang Team)
-- 3. Siết quyền SELECT trên plan_assignments / daily_manager_snapshots
--    (trước đây USING (true) — user thường đọc được chỉ tiêu của đồng nghiệp)
--
-- Yêu cầu: đã chạy migration_roles_and_delegation.sql và migration_admin_level_0.sql
-- (cần get_current_user_role() và is_admin() bao gồm ADMIN_LEVEL_0/1/2).
-- ==========================================

-- ==========================================
-- A. PROFILES: trigger bảo vệ các cột đặc quyền
-- Trigger chạy cả với service_role (RLS bypass nhưng trigger vẫn fire),
-- nên cho qua khi auth.uid() IS NULL (backend dùng service key, không có JWT user).
-- ==========================================
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_role user_role;
BEGIN
  -- Backend service_role (không có user JWT) được phép
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.email IS DISTINCT FROM OLD.email THEN

    v_actor_role := public.get_current_user_role();

    IF v_actor_role IS NULL
       OR v_actor_role NOT IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1', 'ADMIN_LEVEL_2') THEN
      RAISE EXCEPTION 'Không có quyền thay đổi role/trạng thái/phòng ban của hồ sơ.'
        USING ERRCODE = '42501';
    END IF;

    -- Không ai được tự đổi role của chính mình (kể cả admin) để tránh tự leo thang
    IF v_actor = OLD.id AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Không thể tự thay đổi role của chính mình.'
        USING ERRCODE = '42501';
    END IF;

    -- Chỉ L0/L1 mới được cấp hoặc thu hồi quyền ADMIN_LEVEL_0/ADMIN_LEVEL_1
    IF NEW.role IS DISTINCT FROM OLD.role
       AND (NEW.role IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1') OR OLD.role IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1'))
       AND v_actor_role NOT IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1') THEN
      RAISE EXCEPTION 'Chỉ quản trị cấp cao mới được thay đổi quyền admin hệ thống.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- ==========================================
-- B. PROFILES: admin được UPDATE hồ sơ người khác (trang Team)
-- Cột đặc quyền đã được trigger ở trên kiểm soát.
-- ==========================================
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- C. PLAN_ASSIGNMENTS: chỉ thấy chỉ tiêu của mình, trừ admin/advisor
-- (thay thế policy USING (true))
-- ==========================================
DROP POLICY IF EXISTS "plan_assignments_select_all" ON plan_assignments;
DROP POLICY IF EXISTS "Allow select plan assignments" ON plan_assignments;
CREATE POLICY "plan_assignments_select_scoped" ON plan_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_admin()
    OR get_current_user_role() = 'ADVISOR'
  );

-- ==========================================
-- D. DAILY_MANAGER_SNAPSHOTS: chỉ thấy snapshot của mình, trừ admin/advisor
-- (thay thế policy USING (true))
-- ==========================================
DROP POLICY IF EXISTS "snapshots_select_all" ON daily_manager_snapshots;
CREATE POLICY "snapshots_select_scoped" ON daily_manager_snapshots
  FOR SELECT USING (
    manager_id = auth.uid()
    OR is_admin()
    OR get_current_user_role() = 'ADVISOR'
  );

-- Ghi chú:
-- * Policy "plans_select_all" (bảng plans) được giữ nguyên: plans chỉ chứa chỉ tiêu
--   tổng theo kỳ/phòng ban, user thường cần đọc để hiển thị mục tiêu chung.
-- * Quyền đọc toàn bộ của ADVISOR là THIẾT KẾ CÓ CHỦ ĐÍCH (vai trò giám sát toàn hàng,
--   khớp isGlobalRole() trong lib/supabase/api.ts). Nếu muốn giới hạn ADVISOR theo
--   phòng ban, sửa các policy advisor_select_* trong migration_roles_and_delegation.sql.

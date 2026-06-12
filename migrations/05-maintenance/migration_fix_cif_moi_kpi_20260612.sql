-- Fix CIF MỚI KPI so imported legacy customer lists are not counted as new CIFs.
-- CIF MỚI only counts customers explicitly marked customers.cif_moi = true
-- plus completed CIF MỚI product records.

DROP FUNCTION IF EXISTS get_kpi_summary(date, date);

CREATE OR REPLACE FUNCTION get_kpi_summary(start_date DATE, end_date DATE)
RETURNS TABLE (
  manager_id UUID,
  full_name TEXT,
  short_name TEXT,
  product_actuals JSONB
) AS $$
BEGIN
  IF end_date = CURRENT_DATE THEN
    PERFORM snapshot_daily_balances();
  END IF;

  RETURN QUERY
  SELECT
    p.id as manager_id,
    p.full_name,
    p.short_name,
    (
      SELECT COALESCE(jsonb_object_agg(csp.id,
        (
          COALESCE(
            (SELECT SUM(csr.result_value)
             FROM cross_sell_records csr
             WHERE csr.product_id = csp.id
               AND csr.agent_id = p.id
               AND csr.status = 'COMPLETED'
               AND csr.sale_date BETWEEN start_date AND end_date),
            0
          )
          +
          CASE
            WHEN UPPER(csp.name) LIKE '%CIF MỚI%' THEN
              (
                SELECT COUNT(*)::DECIMAL
                FROM customers c
                WHERE c.assigned_manager_id = p.id
                  AND c.cif_moi IS TRUE
                  AND c.created_at::DATE BETWEEN start_date AND end_date
                  AND c.deleted_at IS NULL
              )
            WHEN UPPER(csp.name) LIKE '%HUY ĐỘNG%' THEN
              (
                COALESCE((SELECT dms.total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )
            WHEN UPPER(csp.name) LIKE '%DƯ NỢ%' AND UPPER(csp.name) LIKE '%NGẮN HẠN%' THEN
              (
                COALESCE((SELECT dms.total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )
            WHEN UPPER(csp.name) LIKE '%DƯ NỢ%' AND (UPPER(csp.name) LIKE '%TRUNG%' OR UPPER(csp.name) LIKE '%DÀI HẠN%') THEN
              (
                COALESCE((SELECT dms.total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )
            ELSE 0
          END
        )::DECIMAL(15,2)
      ), '{}'::jsonb)
      FROM cross_sell_products csp
    ) as product_actuals
  FROM profiles p
  WHERE p.role = 'USER';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

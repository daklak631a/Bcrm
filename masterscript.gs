/**
 * ============================================================
 * NEXUS BANKING CRM — MASTER REPORT SCRIPT
 * ============================================================
 * Tự động tạo Google Sheet báo cáo hàng ngày.
 * Cấu trúc: 1 Sheet tổng quan + 1 Sheet/User
 * 
 * Cài đặt: Copy toàn bộ file này vào Google Apps Script
 *          → Chạy setupDailyTrigger() 1 lần để cài cron
 * ============================================================
 */

// ==================== CONFIG ====================
const CONFIG = {
  SUPABASE_URL: getScriptConfig('SUPABASE_URL', 'https://bfcmsbvrnwobykchscgc.supabase.co'),
  SUPABASE_KEY: getScriptConfig('SUPABASE_KEY', ''),
  SPREADSHEET_NAME_PREFIX: getScriptConfig('SPREADSHEET_NAME_PREFIX', 'BCRM_Report'),
  REPORT_SPREADSHEET_ID: getScriptConfig('REPORT_SPREADSHEET_ID', ''),
  FOLDER_ID: getScriptConfig('FOLDER_ID', ''), // Google Drive folder ID (để trống = root)
};

// ==================== MAIN ====================
function main() {
  const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const ssName = `${CONFIG.SPREADSHEET_NAME_PREFIX}_${today}`;

  // Fetch all data
  const profiles = fetchSupabase('profiles', 'id,email,full_name,role,department_id');
  const customers = fetchSupabase('customers', '*', 'deleted_at=is.null');
  const loans = fetchSupabase('loans', '*');
  const deposits = fetchSupabase('deposits', '*');
  const interactions = fetchSupabase('interactions', '*');
  const planAssignments = fetchSupabase('plan_assignments', '*');
  const plans = fetchSupabase('plans', 'id,title,target_date');
  const crossSales = fetchSupabase('cross_sales', '*');
  const dailySnapshots = fetchSupabase('daily_manager_snapshots', '*');
  const crossSellProducts = fetchSupabase('cross_sell_products', 'id,name,type,target');
  const crossSellRecords = fetchSupabase('cross_sell_records', '*');

  if (!profiles || profiles.length === 0) {
    Logger.log('Không có dữ liệu profiles. Dừng script.');
    return;
  }

  // Create spreadsheet
  const ss = getOrCreateReportSpreadsheet(ssName);

  // Classify users
  const admins2 = profiles.filter(p => p.role === 'ADMIN_LEVEL_2');
  const users = profiles.filter(p => p.role === 'USER');
  const admin1 = profiles.filter(p => p.role === 'ADMIN_LEVEL_1');

  syncReportSheets(ss, { profiles, admins2, users, admin1, customers, loans, deposits, interactions, planAssignments, plans, crossSales, dailySnapshots, crossSellProducts, crossSellRecords, today });

  Logger.log(`✅ Báo cáo đã tạo: ${ss.getUrl()}`);
}

// ==================== SUPABASE API ====================
function getScriptConfig(key, fallback) {
  try {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    return value || fallback;
  } catch (e) {
    return fallback;
  }
}

function fetchSupabase(table, select, filter) {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
    Logger.log('❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong Script Properties');
    return [];
  }
  let url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select || '*')}`;
  if (filter) url += `&${filter}`;

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    if (code !== 200) {
      Logger.log(`❌ Lỗi fetch ${table}: ${code} - ${res.getContentText()}`);
      return [];
    }
    return JSON.parse(res.getContentText());
  } catch (e) {
    Logger.log(`❌ Exception fetch ${table}: ${e.message}`);
    return [];
  }
}

function getOrCreateReportSpreadsheet(defaultName) {
  if (CONFIG.REPORT_SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(CONFIG.REPORT_SPREADSHEET_ID);
    } catch (e) {
      Logger.log(`⚠️ Không mở được REPORT_SPREADSHEET_ID hiện tại: ${e.message}`);
    }
  }
  const ss = SpreadsheetApp.create(defaultName);
  PropertiesService.getScriptProperties().setProperty('REPORT_SPREADSHEET_ID', ss.getId());
  if (CONFIG.FOLDER_ID) {
    moveToFolder(ss.getId(), CONFIG.FOLDER_ID);
  }
  return ss;
}

function syncReportSheets(ss, data) {
  const desiredSheetNames = ['📊 Tổng Quan']
    .concat((data.admins2 || []).map(admin => sanitizeSheetName(`🏢 ${admin.full_name}`)))
    .concat((data.users || []).map(user => sanitizeSheetName(`👤 ${user.full_name}`)));

  cleanupManagedSheets(ss, desiredSheetNames);

  createOverviewSheet(ss, data);

  (data.admins2 || []).forEach(admin => {
    const deptUsers = (data.users || []).filter(u => u.department_id === admin.department_id);
    createAdminSheet(ss, admin, deptUsers, data);
  });

  (data.users || []).forEach(user => {
    createUserSheet(ss, user, data);
  });

  const sheets = ss.getSheets();
  if (sheets.length > 1) {
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && defaultSheet.getLastRow() === 0 && defaultSheet.getLastColumn() === 0) {
      ss.deleteSheet(defaultSheet);
    }
  }
}

function upsertManagedSheet(ss, name) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.clear();
  return sheet;
}

function cleanupManagedSheets(ss, desiredSheetNames) {
  const desired = {};
  desiredSheetNames.forEach(name => {
    desired[name] = true;
  });
  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    if (isManagedReportSheetName(name) && !desired[name]) {
      ss.deleteSheet(sheet);
    }
  });
}

function isManagedReportSheetName(name) {
  return name.indexOf('📊 ') === 0 || name.indexOf('🏢 ') === 0 || name.indexOf('👤 ') === 0;
}

// ==================== SHEET: TỔNG QUAN ====================
function createOverviewSheet(ss, data) {
  const sheet = upsertManagedSheet(ss, '📊 Tổng Quan');
  const { admins2, users, customers, loans, deposits, interactions, crossSellProducts, today } = data;

  // Title
  sheet.getRange('A1').setValue(`BÁO CÁO TỔNG HỢP CRM — ${today}`).setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue(`Tạo lúc: ${Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm dd/MM/yyyy')}`).setFontColor('#666');

  // Summary metrics
  const row = 4;
  const metrics = [
    ['Chỉ số', 'Giá trị'],
    ['Tổng nhân sự', data.profiles.length],
    ['Admin Cấp 1', data.admin1.length],
    ['Admin Cấp 2', admins2.length],
    ['Chuyên viên (User)', users.length],
    ['Tổng khách hàng', customers.length],
    ['Khoản vay Active', loans.filter(l => l.status === 'ACTIVE').length],
    ['Tổng dư nợ (VNĐ)', sumField(loans.filter(l => l.status === 'ACTIVE'), 'loan_amount')],
    ['Tiền gửi Active', deposits.filter(d => d.status === 'ACTIVE').length],
    ['Tổng huy động (VNĐ)', sumField(deposits.filter(d => d.status === 'ACTIVE'), 'amount')],
    ['Tương tác tháng này', interactions.filter(i => isThisMonth(i.interaction_date)).length],
  ];
  sheet.getRange(row, 1, metrics.length, 2).setValues(metrics);
  styleHeader(sheet, row, 1, 2);

  // Admin Level 2 breakdown
  const adminRow = row + metrics.length + 2;
  sheet.getRange(adminRow, 1).setValue('THỐNG KÊ THEO ADMIN CẤP 2').setFontSize(12).setFontWeight('bold');
  const adminHeaders = ['Admin', 'Chi Nhánh/Dept', 'Số User', 'Số KH', 'Dư Nợ Vay', 'Tổng Huy Động', 'Tương Tác'];
  sheet.getRange(adminRow + 1, 1, 1, adminHeaders.length).setValues([adminHeaders]);
  styleHeader(sheet, adminRow + 1, 1, adminHeaders.length);

  let r = adminRow + 2;
  admins2.forEach(admin => {
    const deptUsers = users.filter(u => u.department_id === admin.department_id);
    const deptUserIds = deptUsers.map(u => u.id);
    const deptCustomers = customers.filter(c => deptUserIds.includes(c.assigned_manager_id));
    const deptCustomerIds = deptCustomers.map(c => c.id);
    const deptLoans = loans.filter(l => deptCustomerIds.includes(l.customer_id) && l.status === 'ACTIVE');
    const deptDeposits = deposits.filter(d => deptCustomerIds.includes(d.customer_id) && d.status === 'ACTIVE');
    const deptInteractions = interactions.filter(i => deptUserIds.includes(i.manager_id));

    sheet.getRange(r, 1, 1, adminHeaders.length).setValues([[
      admin.full_name,
      admin.department_id || 'N/A',
      deptUsers.length,
      deptCustomers.length,
      sumField(deptLoans, 'loan_amount'),
      sumField(deptDeposits, 'amount'),
      deptInteractions.length,
    ]]);
    r++;
  });

  const productRow = r + 2;
  const period = getCurrentPeriod(today);
  sheet.getRange(productRow, 1).setValue('ĐỘNG LỰC / SẢN PHẨM DỊCH VỤ TOÀN HỆ THỐNG').setFontSize(12).setFontWeight('bold');
  const productHeaders = ['Sản phẩm / Dịch vụ', 'Loại', 'Kế hoạch', 'Thực hiện', '% Hoàn thành', 'Đơn vị'];
  sheet.getRange(productRow + 1, 1, 1, productHeaders.length).setValues([productHeaders]);
  styleHeader(sheet, productRow + 1, 1, productHeaders.length);
  const totalMetrics = buildAggregatedMetrics(users, data, period);
  const overviewRows = buildProductKpiRows(totalMetrics, crossSellProducts || []);
  if (overviewRows.length > 0) {
    sheet.getRange(productRow + 2, 1, overviewRows.length, productHeaders.length).setValues(overviewRows);
  }

  sheet.autoResizeColumns(1, Math.max(adminHeaders.length, productHeaders.length));
}

// ==================== SHEET: ADMIN CẤP 2 ====================
function createAdminSheet(ss, admin, deptUsers, data) {
  const name = sanitizeSheetName(`🏢 ${admin.full_name}`);
  const sheet = upsertManagedSheet(ss, name);
  const { customers, loans, deposits, interactions, today } = data;

  sheet.getRange('A1').setValue(`Admin: ${admin.full_name}`).setFontSize(13).setFontWeight('bold');
  sheet.getRange('A2').setValue(`Department: ${admin.department_id || 'N/A'} | Email: ${admin.email}`).setFontColor('#666');

  // User summary table
  const headers = ['Chuyên Viên', 'Email', 'Số KH', 'Vay Active', 'Dư Nợ', 'Gửi Active', 'Huy Động', 'Tương Tác'];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  styleHeader(sheet, 4, 1, headers.length);

  let r = 5;
  deptUsers.forEach(u => {
    const uCustomers = customers.filter(c => c.assigned_manager_id === u.id);
    const uCustIds = uCustomers.map(c => c.id);
    const uLoans = loans.filter(l => uCustIds.includes(l.customer_id) && l.status === 'ACTIVE');
    const uDeposits = deposits.filter(d => uCustIds.includes(d.customer_id) && d.status === 'ACTIVE');
    const uInteractions = interactions.filter(i => i.manager_id === u.id);

    sheet.getRange(r, 1, 1, headers.length).setValues([[
      u.full_name, u.email,
      uCustomers.length, uLoans.length, sumField(uLoans, 'loan_amount'),
      uDeposits.length, sumField(uDeposits, 'amount'), uInteractions.length,
    ]]);
    r++;
  });

  const kpiStartRow = r + 2;
  sheet.getRange(kpiStartRow, 1).setValue('ĐỘNG LỰC PHÒNG / KPI SẢN PHẨM').setFontSize(12).setFontWeight('bold');
  const kpiHeaders = ['Chuyên Viên', 'CIF Mới', 'BIDV Direct', 'BH Nhân Thọ', 'BH Khoản Vay', 'HĐ Tăng Ròng', 'DN NH Tăng Ròng', 'DN TDH Tăng Ròng', 'Cấp mới HMTD', '% KH Gửi', '% KH Vay'];
  sheet.getRange(kpiStartRow + 1, 1, 1, kpiHeaders.length).setValues([kpiHeaders]);
  styleHeader(sheet, kpiStartRow + 1, 1, kpiHeaders.length);
  const period = getCurrentPeriod(today);
  const kpiRows = deptUsers.map(u => {
    const metrics = buildUserMetrics(u, data, period);
    return [
      u.full_name,
      metrics.actual.cifMoi,
      metrics.actual.bidvDirect,
      metrics.actual.bhNhanTho,
      metrics.actual.bhKhoanVay,
      metrics.actual.huyDongTangRong,
      metrics.actual.duNoNganHanTangRong,
      metrics.actual.duNoTrungHanTangRong,
      metrics.actual.capMoiHmtd,
      safePercent(metrics.actual.huyDongTangRong, metrics.plan.targetDepositsAmount),
      safePercent(metrics.actual.duNoNganHanTangRong + metrics.actual.duNoTrungHanTangRong, metrics.plan.targetLoansAmount)
    ];
  });
  if (kpiRows.length > 0) {
    sheet.getRange(kpiStartRow + 2, 1, kpiRows.length, kpiHeaders.length).setValues(kpiRows);
  }

  const detailStartRow = kpiStartRow + 2 + Math.max(kpiRows.length, 1) + 2;
  sheet.getRange(detailStartRow, 1).setValue('CHI TIẾT KẾ HOẠCH / THỰC HIỆN THEO SẢN PHẨM').setFontSize(12).setFontWeight('bold');
  const detailHeaders = ['Chuyên Viên', 'Sản phẩm / Dịch vụ', 'Loại', 'Kế hoạch', 'Thực hiện', '% Hoàn thành', 'Đơn vị'];
  sheet.getRange(detailStartRow + 1, 1, 1, detailHeaders.length).setValues([detailHeaders]);
  styleHeader(sheet, detailStartRow + 1, 1, detailHeaders.length);
  const detailRows = [];
  deptUsers.forEach(u => {
    const metrics = buildUserMetrics(u, data, period);
    buildProductKpiRows(metrics, data.crossSellProducts || []).forEach(row => {
      detailRows.push([u.full_name].concat(row));
    });
  });
  if (detailRows.length > 0) {
    sheet.getRange(detailStartRow + 2, 1, detailRows.length, detailHeaders.length).setValues(detailRows);
  }

  sheet.autoResizeColumns(1, Math.max(headers.length, kpiHeaders.length, detailHeaders.length));
}

// ==================== SHEET: USER (1 sheet/user) ====================
function createUserSheet(ss, user, data) {
  const name = sanitizeSheetName(`👤 ${user.full_name}`);
  const sheet = upsertManagedSheet(ss, name);
  const { customers, loans, deposits, interactions, crossSellProducts, today } = data;

  // User info header
  sheet.getRange('A1').setValue(`Chuyên viên: ${user.full_name}`).setFontSize(13).setFontWeight('bold');
  sheet.getRange('A2').setValue(`Email: ${user.email} | Dept: ${user.department_id || 'N/A'}`).setFontColor('#666');

  const uCustomers = customers.filter(c => c.assigned_manager_id === user.id);
  const uCustIds = uCustomers.map(c => c.id);
  let row = 4;

  // === SECTION: Khách Hàng ===
  row = writeSection(sheet, row, '📋 DANH SÁCH KHÁCH HÀNG',
    ['Mã KH', 'Khách hàng', 'SĐT', 'Email', 'Địa chỉ', 'Ngày tạo'],
    uCustomers.map(c => [c.id, getCustomerDisplayName(c), c.phone || '', c.email || '', c.address || '',
      formatDate(c.created_at)])
  );

  // === SECTION: Khoản Vay ===
  const uLoans = loans.filter(l => uCustIds.includes(l.customer_id));
  row = writeSection(sheet, row, '💰 KHOẢN VAY',
    ['Mã Vay', 'Số TK', 'Khách Hàng', 'Số Tiền Vay', 'Dư Nợ', 'Ngày Bắt Đầu', 'Ngày Đến Hạn', 'Trạng Thái', 'Ngày Quá Hạn'],
    uLoans.map(l => {
      const cust = uCustomers.find(c => c.id === l.customer_id);
      return [l.id, l.account_number, cust ? getCustomerDisplayName(cust) : l.customer_id,
        l.loan_amount, l.balance, formatDate(l.start_date), formatDate(l.due_date), l.status, l.overdue_days];
    })
  );

  // === SECTION: Tiền Gửi ===
  const uDeposits = deposits.filter(d => uCustIds.includes(d.customer_id));
  row = writeSection(sheet, row, '🏦 TIỀN GỬI',
    ['Mã TG', 'Số TK', 'Khách Hàng', 'Số Tiền', 'Ngày Bắt Đầu', 'Ngày Đáo Hạn', 'Trạng Thái'],
    uDeposits.map(d => {
      const cust = uCustomers.find(c => c.id === d.customer_id);
      return [d.id, d.account_number, cust ? getCustomerDisplayName(cust) : d.customer_id,
        d.amount, formatDate(d.start_date), formatDate(d.maturity_date), d.status];
    })
  );

  // === SECTION: Tương Tác ===
  const uInteractions = interactions.filter(i => i.manager_id === user.id);
  row = writeSection(sheet, row, '📞 LỊCH SỬ TƯƠNG TÁC',
    ['Mã', 'Khách Hàng', 'Loại', 'Mục Đích', 'Kết Quả', 'Ngày', 'Hành Động Tiếp'],
    uInteractions.map(i => {
      const cust = uCustomers.find(c => c.id === i.customer_id);
      return [i.id, cust ? getCustomerDisplayName(cust) : i.customer_id,
        i.type, i.purpose, i.result, formatDate(i.interaction_date), i.next_action || ''];
    })
  );

  // === SECTION: KPI ===
  const period = getCurrentPeriod(today);
  const metrics = buildUserMetrics(user, data, period);
  row = writeSection(sheet, row, '🎯 CHỈ TIÊU KPI',
    ['Mã KPI', 'Chỉ Tiêu Vay', 'Thực Tế Vay', '% Vay', 'Chỉ Tiêu Gửi', 'Thực Tế Gửi', '% Gửi', 'CT Gọi', 'TT Gọi', '% Gọi'],
    [[
      metrics.plan.planLabel,
      metrics.plan.targetLoansAmount, metrics.actual.duNoNganHanTangRong + metrics.actual.duNoTrungHanTangRong, safePercent(metrics.actual.duNoNganHanTangRong + metrics.actual.duNoTrungHanTangRong, metrics.plan.targetLoansAmount),
      metrics.plan.targetDepositsAmount, metrics.actual.huyDongTangRong, safePercent(metrics.actual.huyDongTangRong, metrics.plan.targetDepositsAmount),
      metrics.plan.targetCalls, metrics.actual.actualCalls, safePercent(metrics.actual.actualCalls, metrics.plan.targetCalls),
    ]]
  );

  row = writeSection(sheet, row, '📦 KPI SẢN PHẨM / DỊCH VỤ',
    ['Sản phẩm / Dịch vụ', 'Loại', 'Kế hoạch', 'Thực hiện', '% Hoàn thành', 'Đơn vị'],
    buildProductKpiRows(metrics, crossSellProducts || [])
  );

  sheet.autoResizeColumns(1, 10);
}

// ==================== HELPERS ====================
function writeSection(sheet, startRow, title, headers, dataRows) {
  sheet.getRange(startRow, 1).setValue(title).setFontSize(11).setFontWeight('bold');
  startRow++;

  if (dataRows.length === 0) {
    sheet.getRange(startRow, 1).setValue('Không có dữ liệu').setFontColor('#999').setFontStyle('italic');
    return startRow + 2;
  }

  sheet.getRange(startRow, 1, 1, headers.length).setValues([headers]);
  styleHeader(sheet, startRow, 1, headers.length);
  startRow++;

  sheet.getRange(startRow, 1, dataRows.length, headers.length).setValues(dataRows);
  return startRow + dataRows.length + 2;
}

function styleHeader(sheet, row, col, numCols) {
  const range = sheet.getRange(row, col, 1, numCols);
  range.setBackground('#e8f5e9').setFontWeight('bold').setFontSize(10);
}

function sumField(arr, field) {
  return arr.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
}

function getCustomerDisplayName(customer) {
  if (!customer) return '';
  if (customer.business_name) return customer.business_name;
  if (customer.full_name) return customer.full_name;
  if (customer.last_name || customer.first_name) {
    return [customer.last_name, customer.first_name].filter(Boolean).join(' ');
  }
  return customer.id || '';
}

function getCurrentPeriod(today) {
  const baseDate = today ? new Date(`${today}T00:00:00`) : new Date();
  const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  return {
    start: formatDateKey(startDate),
    end: formatDateKey(baseDate)
  };
}

function formatDateKey(dateValue) {
  const d = new Date(dateValue);
  return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

function normalizeDateKey(value) {
  if (!value) return '';
  try {
    return formatDateKey(value);
  } catch (e) {
    return '';
  }
}

function isDateWithin(value, start, end) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return false;
  return dateKey >= start && dateKey <= end;
}

function getLatestSnapshotValue(snapshots, managerId, targetDate, field) {
  const targetKey = normalizeDateKey(targetDate);
  const filtered = (snapshots || [])
    .filter(s => s.manager_id === managerId && normalizeDateKey(s.snapshot_date) && normalizeDateKey(s.snapshot_date) <= targetKey)
    .sort((a, b) => normalizeDateKey(a.snapshot_date) > normalizeDateKey(b.snapshot_date) ? -1 : 1);
  if (filtered.length === 0) return 0;
  return Number(filtered[0][field] || 0) || 0;
}

function pickCurrentPlanAssignment(userId, planAssignments, plans, endDate) {
  const userPlans = (planAssignments || []).filter(pa => pa.user_id === userId);
  if (userPlans.length === 0) {
    return null;
  }
  const plansById = {};
  (plans || []).forEach(plan => {
    plansById[plan.id] = plan;
  });
  const targetMonth = endDate.slice(0, 7);
  const sortedPlans = userPlans.slice().sort((a, b) => {
    const aPlan = plansById[a.plan_id] || {};
    const bPlan = plansById[b.plan_id] || {};
    const aDate = normalizeDateKey(aPlan.target_date) || '0000-00-00';
    const bDate = normalizeDateKey(bPlan.target_date) || '0000-00-00';
    return aDate > bDate ? -1 : 1;
  });
  const currentPlan = sortedPlans.find(pa => {
    const plan = plansById[pa.plan_id] || {};
    return (normalizeDateKey(plan.target_date) || '').slice(0, 7) === targetMonth;
  });
  return currentPlan || sortedPlans[0];
}

function buildUserMetrics(user, data, period) {
  const userCustomers = (data.customers || []).filter(c => c.assigned_manager_id === user.id);
  const userCustomerIds = userCustomers.map(c => c.id);
  const userCrossSales = (data.crossSales || []).filter(cs => cs.manager_id === user.id && isDateWithin(cs.recorded_date, period.start, period.end));
  const userInteractions = (data.interactions || []).filter(i => i.manager_id === user.id && isDateWithin(i.interaction_date, period.start, period.end));
  const userCrossSellRecords = (data.crossSellRecords || []).filter(record => record.agent_id === user.id && isDateWithin(record.sale_date, period.start, period.end));
  const selectedPlan = pickCurrentPlanAssignment(user.id, data.planAssignments || [], data.plans || [], period.end);
  const actualShort = getLatestSnapshotValue(data.dailySnapshots || [], user.id, period.end, 'total_short_term_loan_balance') - getLatestSnapshotValue(data.dailySnapshots || [], user.id, period.start, 'total_short_term_loan_balance');
  const actualMedium = getLatestSnapshotValue(data.dailySnapshots || [], user.id, period.end, 'total_medium_term_loan_balance') - getLatestSnapshotValue(data.dailySnapshots || [], user.id, period.start, 'total_medium_term_loan_balance');
  const actualDeposit = getLatestSnapshotValue(data.dailySnapshots || [], user.id, period.end, 'total_deposit_balance') - getLatestSnapshotValue(data.dailySnapshots || [], user.id, period.start, 'total_deposit_balance');

  return {
    user,
    period,
    plan: {
      planId: selectedPlan?.plan_id || '',
      planLabel: getPlanLabel(selectedPlan, data.plans || []),
      targetLoansAmount: Number(selectedPlan?.target_loans_amount || 0) || 0,
      targetDepositsAmount: Number(selectedPlan?.target_deposits_amount || 0) || 0,
      targetCalls: Number(selectedPlan?.target_calls || 0) || 0,
      productTargets: {
        targetCifMoi: Number(selectedPlan?.target_cif_moi || 0) || 0,
        targetBidvDirect: Number(selectedPlan?.target_bidv_direct || 0) || 0,
        targetBhNhanTho: Number(selectedPlan?.target_bh_nhan_tho || 0) || 0,
        targetBhKhoanVay: Number(selectedPlan?.target_bh_khoan_vay || 0) || 0,
        targetHuyDongTangRong: Number(selectedPlan?.target_huy_dong_tang_rong || 0) || 0,
        targetDuNoNganHanTangRong: Number(selectedPlan?.target_du_no_ngan_han_tang_rong || 0) || 0,
        targetDuNoTrungHanTangRong: Number(selectedPlan?.target_du_no_trung_han_tang_rong || 0) || 0,
        targetCapMoiHmtd: Number(selectedPlan?.target_cap_moi_hmtd || 0) || 0
      }
    },
    actual: {
      cifMoi: userCustomers.filter(c => isDateWithin(c.created_at, period.start, period.end)).length,
      bidvDirect: userCrossSales.filter(cs => cs.service_type === 'BIDV_DIRECT').length,
      bhNhanTho: sumField(userCrossSales.filter(cs => cs.service_type === 'LIFE_INSURANCE'), 'amount'),
      bhKhoanVay: sumField(userCrossSales.filter(cs => cs.service_type === 'LOAN_INSURANCE'), 'amount'),
      huyDongTangRong: actualDeposit,
      duNoNganHanTangRong: actualShort,
      duNoTrungHanTangRong: actualMedium,
      capMoiHmtd: userCrossSales.filter(cs => cs.service_type === 'CREDIT_LIMIT_NEW').length,
      actualCalls: userInteractions.filter(i => i.type === 'CALL').length,
      crossSellRecords: userCrossSellRecords,
      userCustomerIds
    }
  };
}

function buildAggregatedMetrics(users, data, period) {
  const aggregated = {
    plan: {
      planId: 'Tổng hợp',
      planLabel: 'Tổng hợp',
      targetLoansAmount: 0,
      targetDepositsAmount: 0,
      targetCalls: 0,
      productTargets: {
        targetCifMoi: 0,
        targetBidvDirect: 0,
        targetBhNhanTho: 0,
        targetBhKhoanVay: 0,
        targetHuyDongTangRong: 0,
        targetDuNoNganHanTangRong: 0,
        targetDuNoTrungHanTangRong: 0,
        targetCapMoiHmtd: 0
      }
    },
    actual: {
      cifMoi: 0,
      bidvDirect: 0,
      bhNhanTho: 0,
      bhKhoanVay: 0,
      huyDongTangRong: 0,
      duNoNganHanTangRong: 0,
      duNoTrungHanTangRong: 0,
      capMoiHmtd: 0,
      actualCalls: 0,
      crossSellRecords: []
    }
  };
  (users || []).forEach(user => {
    const metrics = buildUserMetrics(user, data, period);
    aggregated.plan.targetLoansAmount += metrics.plan.targetLoansAmount;
    aggregated.plan.targetDepositsAmount += metrics.plan.targetDepositsAmount;
    aggregated.plan.targetCalls += metrics.plan.targetCalls;
    aggregated.plan.productTargets.targetCifMoi += metrics.plan.productTargets.targetCifMoi;
    aggregated.plan.productTargets.targetBidvDirect += metrics.plan.productTargets.targetBidvDirect;
    aggregated.plan.productTargets.targetBhNhanTho += metrics.plan.productTargets.targetBhNhanTho;
    aggregated.plan.productTargets.targetBhKhoanVay += metrics.plan.productTargets.targetBhKhoanVay;
    aggregated.plan.productTargets.targetHuyDongTangRong += metrics.plan.productTargets.targetHuyDongTangRong;
    aggregated.plan.productTargets.targetDuNoNganHanTangRong += metrics.plan.productTargets.targetDuNoNganHanTangRong;
    aggregated.plan.productTargets.targetDuNoTrungHanTangRong += metrics.plan.productTargets.targetDuNoTrungHanTangRong;
    aggregated.plan.productTargets.targetCapMoiHmtd += metrics.plan.productTargets.targetCapMoiHmtd;
    aggregated.actual.cifMoi += metrics.actual.cifMoi;
    aggregated.actual.bidvDirect += metrics.actual.bidvDirect;
    aggregated.actual.bhNhanTho += metrics.actual.bhNhanTho;
    aggregated.actual.bhKhoanVay += metrics.actual.bhKhoanVay;
    aggregated.actual.huyDongTangRong += metrics.actual.huyDongTangRong;
    aggregated.actual.duNoNganHanTangRong += metrics.actual.duNoNganHanTangRong;
    aggregated.actual.duNoTrungHanTangRong += metrics.actual.duNoTrungHanTangRong;
    aggregated.actual.capMoiHmtd += metrics.actual.capMoiHmtd;
    aggregated.actual.actualCalls += metrics.actual.actualCalls;
    aggregated.actual.crossSellRecords = aggregated.actual.crossSellRecords.concat(metrics.actual.crossSellRecords);
  });
  return aggregated;
}

function getPlanLabel(selectedPlan, plans) {
  if (!selectedPlan) return 'KPI hiện tại';
  const plan = (plans || []).find(item => item.id === selectedPlan.plan_id);
  return plan?.title || selectedPlan.plan_id || 'KPI hiện tại';
}

function getMetricConfigMap() {
  return {
    'CIF MỚI': { actualKey: 'cifMoi', unit: 'KH', targetKey: 'targetCifMoi' },
    'BIDV DIRECT': { actualKey: 'bidvDirect', unit: 'KH', targetKey: 'targetBidvDirect' },
    'BẢO HIỂM NHÂN THỌ': { actualKey: 'bhNhanTho', unit: 'Triệu đồng', targetKey: 'targetBhNhanTho' },
    'BẢO HIỂM KHOẢN VAY': { actualKey: 'bhKhoanVay', unit: 'Triệu đồng', targetKey: 'targetBhKhoanVay' },
    'HUY ĐỘNG VỐN TĂNG RÒNG': { actualKey: 'huyDongTangRong', unit: 'VNĐ', targetKey: 'targetHuyDongTangRong', fallbackTarget: 'targetDepositsAmount' },
    'DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)': { actualKey: 'duNoNganHanTangRong', unit: 'VNĐ', targetKey: 'targetDuNoNganHanTangRong' },
    'DƯ NỢ TÍN DỤNG TĂNG RÒNG (Trung dài hạn)': { actualKey: 'duNoTrungHanTangRong', unit: 'VNĐ', targetKey: 'targetDuNoTrungHanTangRong' },
    'CẤP MỚI HMTD': { actualKey: 'capMoiHmtd', unit: 'KH', targetKey: 'targetCapMoiHmtd' }
  };
}

function buildProductKpiRows(metrics, products) {
  const metricMap = getMetricConfigMap();
  const rows = [];
  (products || []).forEach(product => {
    const config = metricMap[(product.name || '').toUpperCase()];
    let actualValue = 0;
    let targetValue = Number(product.target || 0) || 0;
    let unit = config?.unit || product.type || 'SL';
    if (config) {
      actualValue = Number(metrics.actual[config.actualKey] || 0) || 0;
      const explicitTarget = Number(metrics.plan.productTargets?.[config.targetKey] || 0) || 0;
      if (explicitTarget > 0) {
        targetValue = explicitTarget;
      } else if (config.fallbackTarget) {
        targetValue = Number(metrics.plan[config.fallbackTarget] || 0) || targetValue;
      }
    } else {
      actualValue = (metrics.actual.crossSellRecords || []).filter(record => {
        const status = String(record.status || '').toUpperCase();
        return record.product_id === product.id && (status === 'COMPLETED' || status === 'SUCCESS');
      }).length;
      unit = 'SL';
    }
    rows.push([
      product.name,
      product.type || 'Khác',
      targetValue,
      actualValue,
      safePercent(actualValue, targetValue),
      unit
    ]);
  });
  if (Number(metrics.plan.targetCalls || 0) > 0 || Number(metrics.actual.actualCalls || 0) > 0) {
    rows.push([
      'GỌI ĐIỆN / TƯƠNG TÁC',
      'Tương tác',
      Number(metrics.plan.targetCalls || 0) || 0,
      Number(metrics.actual.actualCalls || 0) || 0,
      safePercent(metrics.actual.actualCalls, metrics.plan.targetCalls),
      'Cuộc gọi'
    ]);
  }
  return rows;
}

function safePercent(actual, target) {
  if (!target || target === 0) return '0%';
  return `${Math.round((actual / target) * 100)}%`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  } catch (e) {
    return String(isoStr);
  }
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function sanitizeSheetName(name) {
  return name.replace(/[\/\\?*\[\]]/g, '_').substring(0, 100);
}

function moveToFolder(fileId, folderId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const folder = DriveApp.getFolderById(folderId);
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch (e) {
    Logger.log(`⚠️ Không thể di chuyển file: ${e.message}`);
  }
}

// ==================== TRIGGER ====================
/**
 * Chạy hàm này 1 lần để cài đặt trigger tự động hàng ngày lúc 6:00 sáng.
 */
function setupDailyTrigger() {
  // Xóa trigger cũ
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'main') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .inTimezone('Asia/Ho_Chi_Minh')
    .create();

  Logger.log('✅ Daily trigger đã được cài đặt: 6:00 AM hàng ngày (GMT+7)');
}

/**
 * Chạy hàm này để test thủ công.
 */
function testRun() {
  main();
}

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
  SUPABASE_URL: 'https://bfcmsbvrnwobykchscgc.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmY21zYnZybndvYnlrY2hzY2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkyMjYzMywiZXhwIjoyMDk0NDk4NjMzfQ.HB37kmvHYdQTSj3rlVnxWnXrY_m-sWt2QD_2iV2JQz4',
  SPREADSHEET_NAME_PREFIX: 'BCRM_Report',
  FOLDER_ID: '', // Google Drive folder ID (để trống = root)
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

  if (!profiles || profiles.length === 0) {
    Logger.log('Không có dữ liệu profiles. Dừng script.');
    return;
  }

  // Create spreadsheet
  const ss = SpreadsheetApp.create(ssName);
  if (CONFIG.FOLDER_ID) {
    moveToFolder(ss.getId(), CONFIG.FOLDER_ID);
  }

  // Classify users
  const admins2 = profiles.filter(p => p.role === 'ADMIN_LEVEL_2');
  const users = profiles.filter(p => p.role === 'USER');
  const admin1 = profiles.filter(p => p.role === 'ADMIN_LEVEL_1');

  // Sheet 1: Tổng Quan
  createOverviewSheet(ss, { profiles, admins2, users, admin1, customers, loans, deposits, interactions, planAssignments, today });

  // 1 sheet per Admin Level 2
  admins2.forEach(admin => {
    const deptUsers = users.filter(u => u.department_id === admin.department_id);
    createAdminSheet(ss, admin, deptUsers, { customers, loans, deposits, interactions, planAssignments });
  });

  // 1 sheet per User
  users.forEach(u => {
    createUserSheet(ss, u, { customers, loans, deposits, interactions, planAssignments });
  });

  // Remove default empty sheet
  const sheets = ss.getSheets();
  if (sheets.length > 1 && sheets[0].getName() === 'Sheet1' && sheets[0].getLastRow() === 0) {
    ss.deleteSheet(sheets[0]);
  }

  Logger.log(`✅ Báo cáo đã tạo: ${ss.getUrl()}`);
}

// ==================== SUPABASE API ====================
function fetchSupabase(table, select, filter) {
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

// ==================== SHEET: TỔNG QUAN ====================
function createOverviewSheet(ss, data) {
  const sheet = ss.insertSheet('📊 Tổng Quan');
  const { admins2, users, customers, loans, deposits, interactions, today } = data;

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

  sheet.autoResizeColumns(1, adminHeaders.length);
}

// ==================== SHEET: ADMIN CẤP 2 ====================
function createAdminSheet(ss, admin, deptUsers, data) {
  const name = sanitizeSheetName(`🏢 ${admin.full_name}`);
  const sheet = ss.insertSheet(name);
  const { customers, loans, deposits, interactions, planAssignments } = data;

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

  sheet.autoResizeColumns(1, headers.length);
}

// ==================== SHEET: USER (1 sheet/user) ====================
function createUserSheet(ss, user, data) {
  const name = sanitizeSheetName(`👤 ${user.full_name}`);
  const sheet = ss.insertSheet(name);
  const { customers, loans, deposits, interactions, planAssignments } = data;

  // User info header
  sheet.getRange('A1').setValue(`Chuyên viên: ${user.full_name}`).setFontSize(13).setFontWeight('bold');
  sheet.getRange('A2').setValue(`Email: ${user.email} | Dept: ${user.department_id || 'N/A'}`).setFontColor('#666');

  const uCustomers = customers.filter(c => c.assigned_manager_id === user.id);
  const uCustIds = uCustomers.map(c => c.id);
  let row = 4;

  // === SECTION: Khách Hàng ===
  row = writeSection(sheet, row, '📋 DANH SÁCH KHÁCH HÀNG',
    ['Mã KH', 'Họ', 'Tên', 'SĐT', 'Email', 'Địa chỉ', 'Ngày tạo'],
    uCustomers.map(c => [c.id, c.last_name, c.first_name, c.phone || '', c.email || '', c.address || '',
      formatDate(c.created_at)])
  );

  // === SECTION: Khoản Vay ===
  const uLoans = loans.filter(l => uCustIds.includes(l.customer_id));
  row = writeSection(sheet, row, '💰 KHOẢN VAY',
    ['Mã Vay', 'Số TK', 'Khách Hàng', 'Số Tiền Vay', 'Dư Nợ', 'Ngày Bắt Đầu', 'Ngày Đến Hạn', 'Trạng Thái', 'Ngày Quá Hạn'],
    uLoans.map(l => {
      const cust = uCustomers.find(c => c.id === l.customer_id);
      return [l.id, l.account_number, cust ? `${cust.last_name} ${cust.first_name}` : l.customer_id,
        l.loan_amount, l.balance, formatDate(l.start_date), formatDate(l.due_date), l.status, l.overdue_days];
    })
  );

  // === SECTION: Tiền Gửi ===
  const uDeposits = deposits.filter(d => uCustIds.includes(d.customer_id));
  row = writeSection(sheet, row, '🏦 TIỀN GỬI',
    ['Mã TG', 'Số TK', 'Khách Hàng', 'Số Tiền', 'Ngày Bắt Đầu', 'Ngày Đáo Hạn', 'Trạng Thái'],
    uDeposits.map(d => {
      const cust = uCustomers.find(c => c.id === d.customer_id);
      return [d.id, d.account_number, cust ? `${cust.last_name} ${cust.first_name}` : d.customer_id,
        d.amount, formatDate(d.start_date), formatDate(d.maturity_date), d.status];
    })
  );

  // === SECTION: Tương Tác ===
  const uInteractions = interactions.filter(i => i.manager_id === user.id);
  row = writeSection(sheet, row, '📞 LỊCH SỬ TƯƠNG TÁC',
    ['Mã', 'Khách Hàng', 'Loại', 'Mục Đích', 'Kết Quả', 'Ngày', 'Hành Động Tiếp'],
    uInteractions.map(i => {
      const cust = uCustomers.find(c => c.id === i.customer_id);
      return [i.id, cust ? `${cust.last_name} ${cust.first_name}` : i.customer_id,
        i.type, i.purpose, i.result, formatDate(i.interaction_date), i.next_action || ''];
    })
  );

  // === SECTION: KPI ===
  const uPlans = planAssignments.filter(pa => pa.user_id === user.id);
  row = writeSection(sheet, row, '🎯 CHỈ TIÊU KPI',
    ['Mã KPI', 'Chỉ Tiêu Vay', 'Thực Tế Vay', '% Vay', 'Chỉ Tiêu Gửi', 'Thực Tế Gửi', '% Gửi', 'CT Gọi', 'TT Gọi', '% Gọi'],
    uPlans.map(pa => [
      pa.plan_id,
      pa.target_loans_amount, pa.actual_loans_amount, safePercent(pa.actual_loans_amount, pa.target_loans_amount),
      pa.target_deposits_amount, pa.actual_deposits_amount, safePercent(pa.actual_deposits_amount, pa.target_deposits_amount),
      pa.target_calls, pa.actual_calls, safePercent(pa.actual_calls, pa.target_calls),
    ])
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

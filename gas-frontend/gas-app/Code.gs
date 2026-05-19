// =============================================
// BCRM - Google Apps Script Backend
// Sử dụng PropertiesService để lưu Spreadsheet ID
// =============================================

var BCRM_TABLES = [
  {
    name: 'Khách hàng',
    headers: ['ID', 'Mã KH (CIF)', 'Tên khách hàng', 'SĐT', 'Email', 'CCCD/CMND', 'Ngày sinh', 'Địa chỉ', 'Nhóm KH', 'Người quản lý', 'Số TK', 'Dư nợ', 'Huy động', 'CIF Mới', 'Ngân Hàng Số', 'Bảo Hiểm Nhân Thọ', 'Bảo Hiểm Khoản Vay', 'Thẻ Tín Dụng', 'Chuyển Tiền Ngoài', 'Merchant QR', 'Ngày tạo', 'Cập nhật lần cuối']
  },
  {
    name: 'Tài khoản (Vay & HĐV)',
    headers: ['ID', 'Mã KH (CIF)', 'Số Tài Khoản', 'Loại (VAY/HUYDONG)', 'Số tiền', 'Lãi suất', 'Kỳ hạn', 'Ngày mở', 'Ngày đến hạn', 'Trạng thái', 'Ghi chú']
  },
  {
    name: 'Tương tác',
    headers: ['ID', 'Mã KH (CIF)', 'Loại tương tác', 'Nội dung', 'Kết quả', 'Người thực hiện', 'Ngày thực hiện', 'Kế hoạch tiếp theo']
  },
  {
    name: 'Sản phẩm',
    headers: ['ID', 'Tên sản phẩm', 'Loại sản phẩm', 'Mục tiêu', 'Trạng thái', 'Ngày tạo']
  },
  {
    name: 'Bán chéo',
    headers: ['ID', 'Mã KH (CIF)', 'ID Sản phẩm', 'Tên sản phẩm', 'Trạng thái', 'Người bán', 'Ngày bán', 'Ghi chú']
  },
  {
    name: 'Cấu hình User',
    headers: ['Email', 'Họ Tên', 'Role', 'Chi nhánh', 'Ngày tạo']
  }
];

function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  // Fallback: container-bound script
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
}

/**
 * Lấy cấu hình hiện tại của app
 */
function getConfig() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  return {
    isConfigured: !!id,
    spreadsheetId: id || ''
  };
}

/**
 * Tạo mới một Google Spreadsheet và lưu ID vào PropertiesService
 */
function setupNewSpreadsheet() {
  try {
    var ss = SpreadsheetApp.create('BCRM - Quản lý Khách hàng ' + new Date().getFullYear());
    var id = ss.getId();
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
    initDatabase(ss);
    return {
      success: true,
      spreadsheetId: id,
      url: ss.getUrl(),
      message: 'Đã tạo Google Sheet thành công!'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Lưu ID của một spreadsheet có sẵn
 */
function setExistingSpreadsheet(spreadsheetId) {
  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
    initDatabase(ss);
    return { success: true, message: 'Đã kết nối Google Sheet!' };
  } catch (e) {
    return { success: false, error: 'ID không hợp lệ hoặc không có quyền truy cập: ' + e.toString() };
  }
}

/**
 * Khởi tạo các Sheet cần thiết trong spreadsheet
 */
function initDatabase(ss) {
  if (!ss) ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Không tìm thấy spreadsheet' };

  for (var i = 0; i < BCRM_TABLES.length; i++) {
    ensureTable(ss, BCRM_TABLES[i]);
  }

  return { success: true };
}

function ensureTable(ss, config) {
  var sheet = ss.getSheetByName(config.name);
  if (!sheet) {
    sheet = ss.insertSheet(config.name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(config.headers);
  } else {
    var currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    for (var i = 0; i < config.headers.length; i++) {
      if (currentHeaders.indexOf(config.headers[i]) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(config.headers[i]);
        currentHeaders.push(config.headers[i]);
      }
    }
  }

  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange
    .setFontWeight('bold')
    .setBackground('#1a73e8')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), sheet.getLastColumn()).createFilter();
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function setupDatabaseTables() {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Chưa kết nối Google Sheet' };
  return initDatabase(ss);
}

/**
 * Phục vụ ứng dụng HTML
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BCRM - Quản lý Khách hàng')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Lấy thông tin user hiện tại
 */
function getCurrentUser() {
  var email = Session.getActiveUser().getEmail();
  var name = email ? email.split('@')[0] : 'Unknown';
  var role = 'USER';
  var branch = '';

  var ss = getSpreadsheet();
  if (ss) {
    var userSheet = ss.getSheetByName('Cấu hình User');
    if (userSheet) {
      var data = userSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === email) {
          name = data[i][1] || name;
          role = data[i][2] || 'USER';
          branch = data[i][3] || '';
          break;
        }
      }
      // Owner auto = ADMIN_LEVEL_1
      try {
        if (email && email === ss.getOwner().getEmail()) {
          role = 'ADMIN_LEVEL_1';
        }
      } catch (e) {}
    }
  }

  return { email: email || '', name: name, role: role, branch: branch };
}

/**
 * Chuyển 2D array thành mảng object
 */
function sheetDataToObjects(data) {
  if (!data || data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j] : '';
    }
    return obj;
  });
}

/**
 * Lấy toàn bộ dữ liệu ứng dụng
 */
function getAppData() {
  var ss = getSpreadsheet();
  if (!ss) return { customers: [], accounts: [], interactions: [], user: getCurrentUser() };

  var customerSheet = ss.getSheetByName('Khách hàng');
  var accountSheet = ss.getSheetByName('Tài khoản (Vay & HĐV)');
  var interactionSheet = ss.getSheetByName('Tương tác');

  return {
    customers: customerSheet ? sheetDataToObjects(customerSheet.getDataRange().getValues()) : [],
    accounts: accountSheet ? sheetDataToObjects(accountSheet.getDataRange().getValues()) : [],
    interactions: interactionSheet ? sheetDataToObjects(interactionSheet.getDataRange().getValues()) : [],
    user: getCurrentUser()
  };
}

/**
 * Tạo ID ngẫu nhiên
 */
function generateId() {
  return 'KH' + new Date().getTime().toString(36).toUpperCase();
}

function getSheetHeaders(sheet) {
  if (!sheet || sheet.getLastColumn() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function buildCustomerRow(data, id, createdAt, updatedAt) {
  var map = {
    'ID': id,
    'Mã KH (CIF)': data['Mã KH (CIF)'] || data.cif || '',
    'Tên khách hàng': data['Tên khách hàng'] || data.name || '',
    'SĐT': data['SĐT'] || data.phone || '',
    'Email': data['Email'] || data.email || '',
    'CCCD/CMND': data['CCCD/CMND'] || data.cccd || '',
    'Ngày sinh': data['Ngày sinh'] || data.dob || '',
    'Địa chỉ': data['Địa chỉ'] || data.address || '',
    'Nhóm KH': data['Nhóm KH'] || data.group || '',
    'Người quản lý': data['Người quản lý'] || data.manager || '',
    'Số TK': data['Số TK'] || data.accountNo || '',
    'Dư nợ': Number(data['Dư nợ'] || data.loan || 0) || 0,
    'Huy động': Number(data['Huy động'] || data.deposit || 0) || 0,
    'CIF Mới': data['CIF Mới'] || data.cifMoi || '',
    'Ngân Hàng Số': data['Ngân Hàng Số'] || data.digitalBanking || '',
    'Bảo Hiểm Nhân Thọ': data['Bảo Hiểm Nhân Thọ'] || data.lifeInsurance || '',
    'Bảo Hiểm Khoản Vay': data['Bảo Hiểm Khoản Vay'] || data.loanInsurance || '',
    'Thẻ Tín Dụng': data['Thẻ Tín Dụng'] || data.creditCard || '',
    'Chuyển Tiền Ngoài': data['Chuyển Tiền Ngoài'] || data.externalTransfer || '',
    'Merchant QR': data['Merchant QR'] || data.merchantQr || '',
    'Ngày tạo': createdAt,
    'Cập nhật lần cuối': updatedAt
  };
  var headers = BCRM_TABLES[0].headers;
  return headers.map(function(header) {
    return map[header] !== undefined ? map[header] : '';
  });
}

/**
 * Lưu hoặc cập nhật khách hàng
 */
function saveCustomer(data) {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Chưa kết nối Google Sheet' };
  initDatabase(ss);
  var sheet = ss.getSheetByName('Khách hàng');
  if (!sheet) return { success: false, error: 'Không tìm thấy sheet Khách hàng' };

  var now = new Date().toLocaleDateString('vi-VN');
  var headers = getSheetHeaders(sheet);

  if (data.id) {
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        var row = i + 1;
        var createdAtIndex = headers.indexOf('Ngày tạo');
        var createdAt = createdAtIndex >= 0 ? values[i][createdAtIndex] : now;
        sheet.getRange(row, 1, 1, headers.length).setValues([buildCustomerRow(data, data.id, createdAt || now, now)]);
        return { success: true, message: 'Cập nhật thành công!' };
      }
    }
    return { success: false, error: 'Không tìm thấy bản ghi' };
  } else {
    var newId = generateId();
    sheet.appendRow(buildCustomerRow(data, newId, now, now));
    return { success: true, id: newId, message: 'Thêm khách hàng thành công!' };
  }
}

/**
 * Xóa một bản ghi theo ID trong sheet
 */
function deleteRecord(sheetName, recordId) {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Chưa kết nối Google Sheet' };
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Không tìm thấy sheet' };

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === recordId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Đã xóa bản ghi!' };
    }
  }
  return { success: false, error: 'Không tìm thấy bản ghi' };
}

/**
 * Lưu tương tác
 */
function saveInteraction(data) {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Chưa kết nối Google Sheet' };
  var sheet = ss.getSheetByName('Tương tác');
  if (!sheet) return { success: false, error: 'Không tìm thấy sheet Tương tác' };

  var newId = 'TT' + new Date().getTime().toString(36).toUpperCase();
  var now = new Date().toLocaleDateString('vi-VN');
  sheet.appendRow([
    newId, data['Mã KH (CIF)'] || '', data['Loại tương tác'] || '',
    data['Nội dung'] || '', data['Kết quả'] || '',
    getCurrentUser().name, data['Ngày thực hiện'] || now,
    data['Kế hoạch tiếp theo'] || ''
  ]);
  return { success: true, id: newId, message: 'Đã lưu tương tác!' };
}

/**
 * Import nhiều khách hàng từ dữ liệu upload
 */
function processCustomerUpload(uploadData) {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Chưa kết nối Google Sheet' };
  initDatabase(ss);
  var sheet = ss.getSheetByName('Khách hàng');
  if (!sheet) return { success: false, error: 'Không tìm thấy sheet' };

  var now = new Date().toLocaleDateString('vi-VN');
  var count = 0;
  var rows = [];
  for (var i = 0; i < uploadData.length; i++) {
    var d = uploadData[i];
    var newId = generateId() + '_' + i;
    rows.push(buildCustomerRow(d, newId, now, now));
    count++;
  }
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, BCRM_TABLES[0].headers.length).setValues(rows);
  }
  return { success: true, message: 'Đã import ' + count + ' bản ghi!' };
}

// =============================================
// BCRM - Google Apps Script Backend
// Sử dụng PropertiesService để lưu Spreadsheet ID
// =============================================

/**
 * Lấy spreadsheet ID từ PropertiesService hoặc biến cứng
 */
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

  var sheetsConfig = [
    {
      name: 'Khách hàng',
      headers: ['ID', 'Mã KH (CIF)', 'Tên khách hàng', 'SĐT', 'Email', 'CCCD/CMND', 'Ngày sinh', 'Địa chỉ', 'Nhóm KH', 'Người quản lý', 'Số TK', 'Dư nợ', 'Huy động', 'Ngày tạo', 'Cập nhật lần cuối']
    },
    {
      name: 'Tài khoản (Vay & HĐV)',
      headers: ['ID', 'Mã KH (CIF)', 'Số Tài Khoản', 'Loại (VAY/HUYDONG)', 'Số tiền', 'Lãi suất', 'Kỳ hạn', 'Ngày mở', 'Ngày đến hạn', 'Ghi chú']
    },
    {
      name: 'Tương tác',
      headers: ['ID', 'Mã KH (CIF)', 'Loại tương tác', 'Nội dung', 'Kết quả', 'Người thực hiện', 'Ngày thực hiện', 'Kế hoạch tiếp theo']
    },
    {
      name: 'Cấu hình User',
      headers: ['Email', 'Họ Tên', 'Role', 'Chi nhánh', 'Ngày tạo']
    }
  ];

  for (var i = 0; i < sheetsConfig.length; i++) {
    var config = sheetsConfig[i];
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      sheet.appendRow(config.headers);
      sheet.getRange(1, 1, 1, config.headers.length)
        .setFontWeight('bold')
        .setBackground('#1a73e8')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  }

  return { success: true };
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

/**
 * Lưu hoặc cập nhật khách hàng
 */
function saveCustomer(data) {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, error: 'Chưa kết nối Google Sheet' };
  var sheet = ss.getSheetByName('Khách hàng');
  if (!sheet) return { success: false, error: 'Không tìm thấy sheet Khách hàng' };

  var now = new Date().toLocaleDateString('vi-VN');

  if (data.id) {
    // Update
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        var row = i + 1;
        sheet.getRange(row, 1, 1, 15).setValues([[
          data.id, data['Mã KH (CIF)'] || '', data['Tên khách hàng'] || '',
          data['SĐT'] || '', data['Email'] || '', data['CCCD/CMND'] || '',
          data['Ngày sinh'] || '', data['Địa chỉ'] || '', data['Nhóm KH'] || '',
          data['Người quản lý'] || '', data['Số TK'] || '', data['Dư nợ'] || 0,
          data['Huy động'] || 0, values[i][13] || now, now
        ]]);
        return { success: true, message: 'Cập nhật thành công!' };
      }
    }
    return { success: false, error: 'Không tìm thấy bản ghi' };
  } else {
    // Insert
    var newId = generateId();
    sheet.appendRow([
      newId, data['Mã KH (CIF)'] || '', data['Tên khách hàng'] || '',
      data['SĐT'] || '', data['Email'] || '', data['CCCD/CMND'] || '',
      data['Ngày sinh'] || '', data['Địa chỉ'] || '', data['Nhóm KH'] || '',
      data['Người quản lý'] || '', data['Số TK'] || '', data['Dư nợ'] || 0,
      data['Huy động'] || 0, now, now
    ]);
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
  var sheet = ss.getSheetByName('Khách hàng');
  if (!sheet) return { success: false, error: 'Không tìm thấy sheet' };

  var now = new Date().toLocaleDateString('vi-VN');
  var count = 0;
  for (var i = 0; i < uploadData.length; i++) {
    var d = uploadData[i];
    var newId = generateId() + '_' + i;
    sheet.appendRow([
      newId, d.cif || '', d.name || '', d.phone || '', d.email || '',
      d.cccd || '', d.dob || '', d.address || '', d.group || '',
      d.manager || '', d.accountNo || '', d.loan || 0, d.deposit || 0,
      now, now
    ]);
    count++;
  }
  return { success: true, message: 'Đã import ' + count + ' bản ghi!' };
}

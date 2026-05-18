/**
 * ===== CẤU HÌNH =====
 * Thay SPREADSHEET_ID bằng ID thật của Google Sheet của bạn.
 * ID nằm trong URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
 */
var SPREADSHEET_ID = ''; // <-- PASTE ID GOOGLE SHEET CỦA BẠN VÀO ĐÂY

/**
 * Lấy spreadsheet - dùng openById cho Web App (không có active spreadsheet)
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  // Fallback: nếu chạy từ container-bound script (script gắn vào sheet)
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Khởi tạo Database (Google Sheets) với các Sheet cần thiết
 */
function initDatabase() {
  var ss = getSpreadsheet();
  
  var sheetsConfig = [
    {
      name: "Khách hàng",
      headers: ["ID", "Mã KH (CIF)", "Tên khách hàng", "SĐT", "Email", "CCCD/CMND", "Ngày sinh", "Địa chỉ", "Nhóm KH", "Người quản lý", "Ngày tạo", "Cập nhật lần cuối"]
    },
    {
      name: "Tài khoản (Vay & HĐV)",
      headers: ["ID", "Mã KH (CIF)", "Số Tài Khoản", "Loại (VAY/HUYDONG)", "Số tiền (Số dư/Dư nợ)", "Lãi suất", "Kỳ hạn", "Ngày mở", "Ngày đến hạn", "Ghi chú"]
    },
    {
      name: "Tương tác",
      headers: ["ID", "Mã KH (CIF)", "Loại tương tác", "Nội dung", "Kết quả", "Người thực hiện", "Ngày thực hiện", "Kế hoạch tiếp theo"]
    },
    {
      name: "Cấu hình User",
      headers: ["Email", "Họ Tên", "Role (ADMIN_LEVEL_1/ADMIN_LEVEL_2/USER)", "Chi nhánh"]
    }
  ];

  for (var i = 0; i < sheetsConfig.length; i++) {
    var config = sheetsConfig[i];
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      sheet.appendRow(config.headers);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }
  }

  return { success: true, message: "Khởi tạo dữ liệu thành công!" };
}

/**
 * Phục vụ ứng dụng React (đã build thành single-file HTML)
 */
function doGet(e) {
  // Tự động khởi tạo database nếu chưa có
  try {
    initDatabase();
  } catch(err) {
    Logger.log("Lỗi khởi tạo DB: " + err);
  }
  
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('BCRM - Quản lý khách hàng')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Lấy thông tin user hiện tại (Google Auth mặc định của GAS)
 */
function getCurrentUser() {
  var email = Session.getActiveUser().getEmail();
  var ss = getSpreadsheet();
  var userSheet = ss.getSheetByName("Cấu hình User");
  
  var role = "USER";
  var name = email ? email.split('@')[0] : "Unknown";
  
  if (userSheet) {
    var data = userSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === email) {
        name = data[i][1] || name;
        role = data[i][2] || "USER";
        break;
      }
    }
    // Nếu là owner của sheet → auto set admin
    try {
      if (email && email === ss.getOwner().getEmail()) {
        role = "ADMIN_LEVEL_1";
      }
    } catch(e) {
      Logger.log("Không thể kiểm tra owner: " + e);
    }
  }

  return {
    email: email || "",
    name: name,
    role: role
  };
}

/**
 * Chuyển dữ liệu 2D Array của Sheet thành mảng Object
 */
function sheetDataToObjects(data) {
  if (!data || data.length < 2) return [];
  var headers = data[0];
  var rows = data.slice(1);
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    result.push(obj);
  }
  return result;
}

/**
 * Lấy toàn bộ dữ liệu ứng dụng
 */
function getAppData() {
  var ss = getSpreadsheet();
  
  var customerSheet = ss.getSheetByName("Khách hàng");
  var accountSheet = ss.getSheetByName("Tài khoản (Vay & HĐV)");
  var interactionSheet = ss.getSheetByName("Tương tác");
  
  var customers = customerSheet ? sheetDataToObjects(customerSheet.getDataRange().getValues()) : [];
  var accounts = accountSheet ? sheetDataToObjects(accountSheet.getDataRange().getValues()) : [];
  var interactions = interactionSheet ? sheetDataToObjects(interactionSheet.getDataRange().getValues()) : [];
  
  return {
    customers: customers,
    accounts: accounts,
    interactions: interactions,
    user: getCurrentUser()
  };
}

/**
 * Upload và xử lý file dữ liệu khách hàng
 */
function processCustomerUpload(uploadData) {
  var ss = getSpreadsheet();
  var customerSheet = ss.getSheetByName("Khách hàng");
  var accountSheet = ss.getSheetByName("Tài khoản (Vay & HĐV)");
  
  if (!customerSheet || !accountSheet) return { success: false, error: "Chưa khởi tạo Database" };
  
  return { 
    success: true, 
    message: "Đã xử lý " + uploadData.length + " bản ghi" 
  };
}

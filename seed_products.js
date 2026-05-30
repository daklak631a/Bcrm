const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error("Could not find Supabase URL or Service Role key in .env.local");
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const products = [
  { name: 'CIF MỚI', type: 'Tài khoản', description: 'Mở mới CIF khách hàng', target: 100, metric_type: 'QUANTITY', unit_label: 'KH' },
  { name: 'BIDV DIRECT', type: 'Dịch vụ khác', description: 'Đăng ký dịch vụ BIDV Direct', target: 100, metric_type: 'QUANTITY', unit_label: 'KH' },
  { name: 'BẢO HIỂM NHÂN THỌ', type: 'Bảo hiểm', description: 'Bảo hiểm nhân thọ (Triệu đồng)', target: 500, metric_type: 'AMOUNT', unit_label: 'Triệu đồng' },
  { name: 'BẢO HIỂM KHOẢN VAY', type: 'Bảo hiểm', description: 'Bảo hiểm khoản vay (Triệu đồng)', target: 500, metric_type: 'AMOUNT', unit_label: 'Triệu đồng' },
  { name: 'HUY ĐỘNG VỐN TĂNG RÒNG', type: 'Huy động vốn', description: 'Huy động vốn tăng ròng (Tỷ đồng)', target: 10, metric_type: 'AMOUNT', unit_label: 'Tỷ đồng' },
  { name: 'DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)', type: 'Tín dụng', description: 'Dư nợ tín dụng tăng ròng ngắn hạn (Tỷ đồng)', target: 10, metric_type: 'AMOUNT', unit_label: 'Tỷ đồng' },
  { name: 'DƯ NỢ TÍN DỤNG TĂNG RÒNG (Trung dài hạn)', type: 'Tín dụng', description: 'Dư nợ tín dụng tăng ròng trung dài hạn (Tỷ đồng)', target: 10, metric_type: 'AMOUNT', unit_label: 'Tỷ đồng' },
  { name: 'CẤP MỚI HMTD', type: 'Tín dụng', description: 'Cấp mới hạn mức tín dụng (Mục tiêu SL KH)', target: 50, metric_type: 'QUANTITY', unit_label: 'KH' }
];

async function main() {
  console.log("Connecting to Supabase using Service Role Key...");
  
  console.log("Deleting existing products in cross_sell_products table...");
  const { error: deleteError } = await supabase
    .from('cross_sell_products')
    .delete()
    .neq('name', '---');

  if (deleteError) {
    console.error("Error deleting products:", deleteError);
    process.exit(1);
  }
  console.log("Successfully deleted existing products.");

  console.log("Seeding products...");
  const { data, error } = await supabase
    .from('cross_sell_products')
    .insert(products)
    .select();

  if (error) {
    console.error("Error seeding products:", error);
    process.exit(1);
  }

  console.log("Successfully seeded products! Seeded products list:");
  console.table(data.map(p => ({ ID: p.id, Name: p.name, Type: p.type, Target: p.target })));
}

main();


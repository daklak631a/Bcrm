const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const anonKey = anonKeyMatch[1].trim();
const serviceKey = serviceKeyMatch[1].trim();

async function checkPlans(key, label) {
  console.log(`\n--- Fetching plans with ${label} ---`);
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/plans?select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (!response.ok) {
      console.error(`${label} failed:`, response.status, response.statusText);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const data = await response.json();
    console.log(`${label} success. Count:`, data.length);
    console.log(`Sample rows:`, data.slice(0, 3));
  } catch (err) {
    console.error(`${label} error:`, err);
  }
}

async function main() {
  await checkPlans(anonKey, "Anonymous Key (RLS Active)");
  await checkPlans(serviceKey, "Service Role Key (Bypass RLS)");
}

main();

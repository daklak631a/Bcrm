const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const serviceKey = serviceKeyMatch[1].trim();

async function main() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.daklak631a@gmail.com`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    const data = await response.json();
    console.log("Profile for daklak631a@gmail.com:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();

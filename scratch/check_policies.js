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
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_policies`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Database policies:", data);
    } else {
      // Fallback: Query pg_policies from custom SQL if possible, or just print warning.
      console.log("rpc/get_policies does not exist. Trying generic query or skipping.");
      
      // Let's query policies by fetching from a system view if PostgREST allows it.
      // Usually system views are not exposed on PostgREST, so we will create a migration to be safe.
    }
  } catch (err) {
    console.error("Error checking policies:", err);
  }
}

main();

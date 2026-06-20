const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Connecting to:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

const uiKeys = ["admin", "dj_lineup", "faq", "general", "map", "registry", "story", "travel", "weekend", "images", "meals", "gallery"];

async function sync() {
  try {
    const configUiDir = path.resolve(__dirname, '..', 'config', 'ui');
    console.log("Reading configs from:", configUiDir);
    
    for (const key of uiKeys) {
      const filePath = path.join(configUiDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const value = JSON.parse(fileContent);
        
        console.log(`Uploading site config '${key}'...`);
        const { error } = await supabase.from("site_configs").upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        });
        
        if (error) {
          console.error(`Failed to upload config '${key}':`, error);
        } else {
          console.log(`Successfully uploaded config '${key}'!`);
        }
      } else {
        console.warn(`File not found: ${filePath}`);
      }
    }
    
    console.log("All UI configurations synchronized to Supabase successfully!");
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

sync();

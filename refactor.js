const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/app/api/admin/dashboard/route.ts',
  'src/app/api/admin/edit-question/route.ts',
  'src/app/api/admin/export/route.ts',
  'src/app/api/admin/logs/route.ts',
  'src/app/api/admin/restore-question/route.ts',
  'src/app/api/admin/save-questions/route.ts',
  'src/app/api/admin/search-questions/route.ts',
  'src/app/api/jobs/status/route.ts',
  'src/app/api/submit-test/route.ts',
  'src/app/api/current-affairs/fetch-articles/route.ts',
  'src/app/api/current-affairs/generate-questions/route.ts',
  'src/app/api/get-upload-url/route.ts',
  'src/app/api/process-next/route.ts',
  'src/app/api/register-upload/route.ts'
];

targetFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    if (content.includes("import { createClient } from '@supabase/supabase-js';")) {
      content = content.replace(
        "import { createClient } from '@supabase/supabase-js';", 
        "import { getSupabaseAdmin } from '@/lib/auth-verify';"
      );
    }
    
    // Remove top-level or any createClient that takes NEXT_PUBLIC_SUPABASE_URL!
    const createClientRegex = /const\s+supabaseAdmin\s*=\s*createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\);?/g;
    
    if (createClientRegex.test(content)) {
      content = content.replace(createClientRegex, '');
      
      // Inject it into export async function GET/POST
      content = content.replace(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{/g, (match) => {
        return match + '\n  const supabaseAdmin = getSupabaseAdmin();';
      });
      
      fs.writeFileSync(file, content);
      console.log('Fixed', file);
    } else {
      console.log('Skipped (regex not matched)', file);
    }
  } catch (err) {
    console.error('Error on', file, err.message);
  }
});

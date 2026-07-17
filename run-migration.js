const url = 'https://apgpsutomkgktthpkrhz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3BzdXRvbWtna3R0aHBrcmh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg3NDkxMCwiZXhwIjoyMDk4NDUwOTEwfQ.T_eabZRHqq76KTuoW9rSxQsMHGqmbZ89yztCJq3u-9Q';
fetch(url + '/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': 'Bearer ' + key
  },
  body: JSON.stringify({
    sql: 'ALTER TABLE questions ENABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS "questions_read_all" ON questions; DROP POLICY IF EXISTS "Enable read access for all users" ON questions;'
  })
}).then(res => res.text()).then(console.log);

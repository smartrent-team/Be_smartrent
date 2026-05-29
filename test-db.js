const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xifjbxdrruqtoobzlfqz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpZmpieGRycnVxdG9vYnpsZnF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA1Mjc2OSwiZXhwIjoyMDk0NjI4NzY5fQ.T7EZETXv4ME5fQik85t0yj11AXjj_Jg-F852ZhxIqNs');

async function main() {
  const { data, error } = await supabase.from('users').select('id, full_name, role, email, phone').limit(5);
  console.log("Error:", error);
  console.log("Users:", data);
}
main();

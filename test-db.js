import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const vars = fs.readFileSync('.dev.vars', 'utf8');
const urlMatch = vars.match(/VITE_SUPABASE_URL="?([^"\n]+)/);
const keyMatch = vars.match(/VITE_SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)/);

const supabase = createClient(urlMatch![1], keyMatch![1]);
supabase.auth.admin.getUserById("cf0022ec-d4d8-4b0b-ae63-a388e3dd10bf").then(({data, error}) => {
  if (error) console.error(error);
  else console.log(JSON.stringify(data.user.user_metadata, null, 2));
});

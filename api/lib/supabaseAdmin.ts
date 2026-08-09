import { createClient } from '@supabase/supabase-js';

// Server-only client: the service_role key bypasses Row Level Security, so it
// must only ever be read from process.env in a serverless function, never
// exposed to the browser (that's what src/lib/supabase.ts + the anon key are
// for). Import this from files under /api, not from anything in src/.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

export const supabaseAdmin = createClient(url, serviceKey);

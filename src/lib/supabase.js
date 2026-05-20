import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasEnvValue = (value) => Boolean(value && !String(value).includes('YOUR_'));

export const isSupabaseConfigured = hasEnvValue(url) && hasEnvValue(anon);
export const supabase = isSupabaseConfigured ? createClient(url, anon) : null;

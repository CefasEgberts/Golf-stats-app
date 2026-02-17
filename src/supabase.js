import { createClient } from '@supabase/supabase-js'

// Vervang deze waarden met jouw Supabase project gegevens
// Je vindt deze in Supabase → Project Settings → API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

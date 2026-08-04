import { createClient } from '@supabase/supabase-js'

import { supabaseAnonKey } from '@/lib/supabase/client'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey

if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured')
if (!supabaseKey) throw new Error('SUPABASE_SERVICE_KEY is not configured')

// Service-role client — bypasses RLS. Use ONLY for trusted server-side lookups.
export const db = createClient(supabaseUrl, supabaseKey)

// User-scoped client — RLS policies apply against the caller's JWT.
export const userDb = (token: string) =>
  createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

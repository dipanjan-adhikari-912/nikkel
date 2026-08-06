import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured')
if (!serviceKey) throw new Error('SUPABASE_SERVICE_KEY is not configured')

// Service-role client — bypasses RLS. Server-only; never import into client components.
// Used by the Paddle webhook handler to write subscriptions.
export const supabaseAdmin = createClient(supabaseUrl, serviceKey)

import { createClient } from '@supabase/supabase-js'
import { env } from './runtime.js'

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

export const supabaseAuth = createClient(env.supabaseUrl, env.publishableKey, options).auth
export const supabaseAdmin = env.secretKey
  ? createClient(env.supabaseUrl, env.secretKey, options).auth.admin
  : null
export const supabaseStorage = env.secretKey ? createClient(env.supabaseUrl,env.secretKey,options).storage : null

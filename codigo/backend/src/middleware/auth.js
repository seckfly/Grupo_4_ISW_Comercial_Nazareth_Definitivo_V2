import { pool } from '../config/db.js'
import { supabaseAuth } from '../config/supabase.js'
import { createAuthMiddleware } from '../services/sessionService.js'

export const auth = createAuthMiddleware({
  getUser: (token) => supabaseAuth.getUser(token),
  async findProfile(authUserId, sessionId) {
    const { rows: [profile] } = await pool.query(
      'SELECT p.id, p.name, p.role, p.is_active, p.is_protected, ' +
      "CASE WHEN p.role = 'client' THEN c.phone ELSE p.phone END AS phone, " +
      'nazareth.session_is_active($2, p.auth_user_id) AS session_active ' +
      'FROM nazareth.profiles p LEFT JOIN nazareth.customers c ON c.user_id = p.id WHERE p.auth_user_id = $1', [authUserId, sessionId],
    )
    return profile
  },
})

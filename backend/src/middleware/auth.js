import { pool } from '../config/db.js'
import { supabaseAuth } from '../config/supabase.js'
import { createAuthMiddleware } from '../services/sessionService.js'

export const auth = createAuthMiddleware({
  getUser: (token) => supabaseAuth.getUser(token),
  async findProfile(authUserId, sessionId) {
    const { rows: [profile] } = await pool.query(
      'SELECT id, name, role, is_active, nazareth.session_is_active($2, auth_user_id) AS session_active ' +
      'FROM nazareth.profiles WHERE auth_user_id = $1', [authUserId, sessionId],
    )
    return profile
  },
})

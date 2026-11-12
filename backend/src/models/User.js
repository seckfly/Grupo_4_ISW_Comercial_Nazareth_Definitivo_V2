const directoryFields = 'id, name, email, role, is_active AS "isActive", is_protected AS "isProtected", (access_removed_at IS NOT NULL) AS "removalPending", (SELECT c.phone FROM nazareth.customers c WHERE c.user_id = account_directory.id) AS phone'

export const User = {
  async list(db) {
    const { rows } = await db.query('SELECT ' + directoryFields + ' FROM nazareth.account_directory ORDER BY id')
    return rows
  },

  async findById(db, id) {
    const { rows: [profile] } = await db.query(
      'SELECT ' + directoryFields + ', auth_user_id FROM nazareth.account_directory WHERE id = $1', [id],
    )
    return profile
  },

  async create(db, { authUserId, name, role }) {
    const { rows: [profile] } = await db.query(
      'INSERT INTO nazareth.profiles (auth_user_id, name, role) VALUES ($1, $2, $3) RETURNING id',
      [authUserId, name, role],
    )
    return profile.id
  },

  async lock(db, id) {
    await db.query('SELECT id FROM nazareth.profiles WHERE id = $1 FOR UPDATE', [id])
  },

  async update(db, id, { name, role, isActive }) {
    await db.query('UPDATE nazareth.profiles SET name = $1, role = $2, is_active = $3 WHERE id = $4', [name, role, isActive, id])
  },

  async ensureCustomer(db, id, name, phone) {
    if (phone === undefined) {
      await db.query('INSERT INTO nazareth.customers (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [id, name])
    } else {
      await db.query('INSERT INTO nazareth.customers (user_id, name, phone) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone', [id, name, phone])
    }
  },
}

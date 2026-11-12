const directoryFields = `id, name, email, role, is_active AS "isActive", is_protected AS "isProtected", (access_removed_at IS NOT NULL) AS "removalPending", (CASE WHEN account_directory.role = 'client' THEN (SELECT c.phone FROM nazareth.customers c WHERE c.user_id = account_directory.id) ELSE (SELECT p.phone FROM nazareth.profiles p WHERE p.id = account_directory.id) END) AS phone`

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

  async create(db, { authUserId, name, role, phone = null }) {
    const { rows: [profile] } = await db.query(
      'INSERT INTO nazareth.profiles (auth_user_id, name, role, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [authUserId, name, role, role === 'admin' ? phone : null],
    )
    return profile.id
  },

  async lock(db, id) {
    await db.query('SELECT id FROM nazareth.profiles WHERE id = $1 FOR UPDATE', [id])
  },

  async update(db, id, { name, role, isActive }) {
    await db.query('UPDATE nazareth.profiles SET name = $1, role = $2, is_active = $3 WHERE id = $4', [name, role, isActive, id])
  },

  async setPhone(db, id, role, phone) {
    if (role === 'client') {
      const { rowCount } = await db.query('UPDATE nazareth.customers SET phone = $1 WHERE user_id = $2', [phone, id])
      if (!rowCount) throw Object.assign(new Error('No existe un cliente asociado a esta cuenta'), { status: 404 })
    } else {
      await db.query('UPDATE nazareth.profiles SET phone = $1 WHERE id = $2', [phone, id])
    }
  },

  async ensureCustomer(db, id, name, phone) {
    if (phone === undefined) {
      await db.query('INSERT INTO nazareth.customers (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [id, name])
    } else {
      await db.query('INSERT INTO nazareth.customers (user_id, name, phone) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone', [id, name, phone])
    }
  },
}

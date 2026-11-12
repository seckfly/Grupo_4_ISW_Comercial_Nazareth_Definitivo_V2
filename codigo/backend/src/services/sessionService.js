const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function createAuthMiddleware({ getUser, findProfile }) {
  return async (req, res, next) => {
    const token = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '')?.[1]
    if (!token) return res.status(401).json({ message: 'Inicia sesión para continuar' })

    try {
      const { data, error } = await getUser(token)
      if (error && (!error.status || error.status >= 500 || error.status === 429)) {
        return res.status(503).json({ message: 'No se pudo verificar la sesión. Intenta de nuevo.' })
      }
      const identity = data?.user
      if (error || !identity || !uuid.test(identity.id)) {
        return res.status(401).json({ message: 'Sesión inválida o vencida' })
      }

      // El identificador de sesión solo se lee después de validar el token con Auth.
      let sessionId
      try {
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
        sessionId = claims?.session_id
      } catch { /* El token no tiene un cuerpo JWT legible. */ }
      if (!uuid.test(sessionId)) return res.status(401).json({ message: 'Sesión inválida o vencida' })

      const profile = await findProfile(identity.id, sessionId)
      if (!profile || !profile.is_active) {
        return res.status(403).json({ message: 'La cuenta no tiene acceso activo' })
      }
      if (!profile.session_active) return res.status(401).json({ message: 'La sesión se cerró' })

      req.user = { id: profile.id, name: profile.name, email: identity.email, role: profile.role,
        phone: profile.phone ?? null, isProtected: Boolean(profile.is_protected) }
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

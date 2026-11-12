import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(supabase ? undefined : null)
  const [verification, setVerification] = useState(null)
  const token = session?.access_token
  const identity = session?.user.id

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api.profile(token, controller.signal).then((user) => {
      if (!controller.signal.aborted) setVerification({ identity, token, user })
    }).catch((error) => {
      if (controller.signal.aborted) return
      setVerification({ identity, token, error: error.status ? error.message : 'No se pudo conectar con el servicio de acceso' })
      if (error.status === 401 || error.status === 403) {
        void supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      }
    })
    return () => controller.abort()
  }, [identity, token])

  async function login(email, password) {
    setVerification(null)
    if (!supabase) throw new Error('El acceso a Supabase aún no está configurado')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }).catch(() => ({ error: {} }))
    if (error) {
      throw new Error(error.code === 'invalid_credentials'
        ? 'Las credenciales no coinciden. Revisa el correo y la contraseña.'
        : 'No se pudo iniciar sesión. Intenta de nuevo.')
    }
  }

  async function refreshProfile() {
    if (!token) throw new Error('Inicia sesión para continuar')
    const updated = await api.profile(token)
    setVerification({ identity, token, user: updated })
    return updated
  }

  async function forgetDeletedSession() {
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => {})
    setSession(null)
    setVerification(null)
  }

  async function logout() {
    const { error } = await supabase.auth.signOut({ scope: 'local' }).catch(() => ({ error: true }))
    if (error) throw new Error('No se pudo cerrar la sesión. Intenta de nuevo.')
    setVerification(null)
  }

  const user = session && verification?.identity === identity ? verification.user : null
  const checking = session === undefined || Boolean(token && verification?.token !== token)
  return <AuthContext.Provider value={{ user, checking, authError: verification?.error, login, logout, refreshProfile, forgetDeletedSession }}>
    {children}
  </AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

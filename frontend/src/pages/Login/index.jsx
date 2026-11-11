import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Store } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login, checking, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = checking || submitting

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setError('')
    setSubmitting(true)
    try { await login(email, password) } catch (error) { setError(error.message) } finally { setSubmitting(false) }
  }

  return <main className="login-page">
    <section className="login-story">
      <div className="login-brand"><span>N</span><div>Comercial <b>Nazareth</b></div></div>
      <div className="story-copy">
        <p className="eyebrow">Ascope · La Libertad</p>
        <h1>Tu tienda,<br/><em>bien contada.</em></h1>
        <p>Ventas claras, stock al día y decisiones con información real. Una herramienta hecha para el ritmo de la bodega.</p>
      </div>
      <div className="story-proof">
        <div><strong>32</strong><span>ventas hoy</span></div>
        <div><strong>S/ 547.20</strong><span>caja acumulada</span></div>
        <div><strong>3</strong><span>productos por reponer</span></div>
      </div>
    </section>
    <section className="login-panel">
      <div className="login-form-wrap">
        <div className="login-icon"><Store/></div>
        <p className="eyebrow">Acceso seguro</p>
        <h2>Bienvenido de vuelta</h2>
        <p className="login-help">Ingresa con el perfil que usas para Comercial Nazareth.</p>
        <form onSubmit={submit} aria-busy={busy}>
          <label>Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required/></label>
          <label>Contraseña<div className="password">
            <LockKeyhole/><input value={password} onChange={(event) => setPassword(event.target.value)} type={show ? 'text' : 'password'} autoComplete="current-password" required/>
            <button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)}>{show ? <EyeOff/> : <Eye/>}</button>
          </div></label>
          {(error || authError) && <p className="form-error" role="alert">{error || authError}</p>}
          <button className="login-submit" disabled={busy}>{busy ? 'Verificando acceso…' : 'Ingresar al panel'} <ArrowRight/></button>
        </form>
        <div className="demo-note"><strong>Acceso con cuenta registrada</strong><span>Usa el correo y la contraseña de tu cuenta.</span></div>
      </div>
      <footer>Protegido con acceso por roles · Comercial Nazareth 2026</footer>
    </section>
  </main>
}

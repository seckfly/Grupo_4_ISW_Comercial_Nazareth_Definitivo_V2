import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Card } from './Card'

export default function PhoneForm() {
  const { user, refreshProfile } = useAuth()
  const [phone, setPhone] = useState(user?.phone || '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setPhone(user?.phone || '') }, [user?.phone])

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setNotice(''); setError('')
    try {
      await api.updateOwnPhone(phone)
      await refreshProfile()
      setNotice(phone.trim() ? 'Teléfono actualizado correctamente.' : 'Número de teléfono eliminado.')
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }

  return <Card>
    <h3>Mi teléfono</h3>
    <form className="account-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="own-account-phone">Teléfono (opcional)</label>
      <input id="own-account-phone" type="tel" autoComplete="tel" maxLength={25} placeholder="Ej. 987 654 321"
        value={phone} onChange={event => setPhone(event.target.value)} disabled={busy}/>
      <p className="muted">Puedes agregar, modificar o borrar tu número. Si lo dejas vacío, no se mostrará ningún teléfono registrado.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar teléfono'}</button>
    </form>
  </Card>
}

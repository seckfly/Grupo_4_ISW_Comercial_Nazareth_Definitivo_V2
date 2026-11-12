import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Card } from './Card'
import { InventoryDrawer } from '../../pages/Inventory/InventoryDrawers'

export default function AccountRemoval() {
  const { user, forgetDeletedSession } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (user?.isProtected) return null

  async function submit(event) {
    event.preventDefault()
    if (busy || confirmation !== 'ELIMINAR' || !password) return
    setBusy(true); setError('')
    try {
      await api.deleteOwnAccount(password, confirmation)
      await forgetDeletedSession()
    } catch (error) { setError(error.message); setBusy(false) }
  }

  return <>
    <Card>
      <h3>Eliminar mi cuenta</h3>
      <p>Si dejas de utilizar Comercial Nazareth, puedes eliminar tu acceso. Las operaciones comerciales ya realizadas se conservan para el historial del negocio.</p>
      <button type="button" className="secondary confirmation-danger" onClick={() => setOpen(true)}>
        <Trash2/> Eliminar mi cuenta
      </button>
    </Card>
    {open && <InventoryDrawer title="Eliminar mi cuenta" close={() => !busy && setOpen(false)} busy={busy}>
      <form className="account-form" onSubmit={submit} aria-busy={busy}>
        <p>Esta acción retirará tu acceso y no podrás volver a iniciar sesión con esta cuenta. Las ventas y otros registros históricos del negocio se conservarán. Si tienes reservas activas, deberás resolverlas antes.</p>
        <label htmlFor="self-delete-password">Contraseña actual</label>
        <input id="self-delete-password" type="password" autoComplete="current-password" required
          value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/>
        <label htmlFor="self-delete-confirmation">Escribe ELIMINAR para confirmar</label>
        <input id="self-delete-confirmation" name="confirmation" autoComplete="off" spellCheck={false}
          value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={busy}/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="confirmation-actions">
          <button className="secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
          <button className="secondary confirmation-danger" type="submit" disabled={busy || !password || confirmation !== 'ELIMINAR'}>
            {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </div>
      </form>
    </InventoryDrawer>}
  </>
}

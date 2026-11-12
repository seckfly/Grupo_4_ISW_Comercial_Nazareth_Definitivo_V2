import { useState } from 'react'
import { InventoryDrawer } from '../../pages/Inventory/InventoryDrawers'

export default function ConfirmationDrawer({ title, children, close, onConfirm, confirmLabel, requireWord = false }) {
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy || (requireWord && confirmation !== 'ELIMINAR')) return
    setBusy(true)
    setError('')
    try { await onConfirm(confirmation) }
    catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return <InventoryDrawer title={title} close={close} busy={busy}>
    <form onSubmit={submit} aria-busy={busy}>
      {children}
      {requireWord && <label>Escribe ELIMINAR para confirmar
        <input value={confirmation} onChange={event => setConfirmation(event.target.value)}
          autoComplete="off" spellCheck={false} required disabled={busy}/>
      </label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="confirmation-actions">
        <button autoFocus type="button" className="secondary" onClick={close} disabled={busy}>Cancelar</button>
        <button type="submit" className={requireWord ? 'secondary confirmation-danger' : 'primary'}
          disabled={busy || (requireWord && confirmation !== 'ELIMINAR')}>{busy ? 'Guardando…' : confirmLabel}</button>
      </div>
    </form>
  </InventoryDrawer>
}

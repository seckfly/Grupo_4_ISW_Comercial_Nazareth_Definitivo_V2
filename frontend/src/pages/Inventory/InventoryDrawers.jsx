import { useEffect, useRef, useState } from 'react'
import { History, X } from 'lucide-react'
import { api } from '../../services/api'
import { Skeleton, EmptyState } from '../../components/ui/States'
import DecimalInput from '../../components/ui/DecimalInput'
import { decimalUnits } from '../../../../shared/numbers.mjs'
import AmountInput from '../../components/ui/AmountInput'
import { quantityLabel } from '../../utils/format'

export function InventoryDrawer({ title, kicker, close, busy = false, children }) {
  const container = useRef(null)
  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    container.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  function handleKey(event) {
    if (event.key === 'Escape' && !busy) close()
    if (event.key !== 'Tab') return
    const controls = [...container.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return <div className="drawer-backdrop">
    <section className="form-drawer inventory-drawer" role="dialog" aria-modal="true" aria-labelledby="inventory-drawer-title" tabIndex={-1} ref={container} onKeyDown={handleKey}>
      <header><div><p className="eyebrow">{kicker}</p><h2 id="inventory-drawer-title">{title}</h2></div><button className="icon-btn" type="button" disabled={busy} onClick={close} aria-label="Cerrar panel"><X/></button></header>
      {children}
    </section>
  </div>
}

export function ProductDrawer({ product, categories, close, saved, fromPurchase = false }) {
  const editing = Boolean(product)
  const [form, setForm] = useState(() => ({
    name: product?.name ?? '', categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    unit: product?.unit ?? 'Unidad', cost: product?.cost ?? '', price: product?.price ?? '',
    minimum: product?.minimum ?? 5, isActive: product?.isActive ?? true,
    ...(!editing ? { initialStock: 0 } : {}),
  }))
  const [busy, setBusy] = useState(false)
  const [uploading,setUploading]=useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const units = [...new Set(['Unidad', 'Paquete', 'Kg', ...(product ? [product.unit] : [])])]

  function field(key, value) { setForm((current) => ({ ...current, [key]: value })) }
  async function photo(file) {
    if(!file)return
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('Usa JPEG, PNG o WebP de hasta 2 MiB.');return}
    setUploading(true);setError('')
    try {const result=await api.uploadPhoto(file);field('imageUrl',result.url)}catch(error){setError(error.message)}finally{setUploading(false)}
  }
  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      for (const key of ['cost', 'price', 'minimum', ...(!editing ? ['initialStock'] : [])]) {
        decimalUnits(form[key], { label: key === 'cost' ? 'El costo' : key === 'price' ? 'El precio' : key === 'minimum' ? 'El mínimo' : 'El stock inicial' })
      }
      const result = editing ? await api.updateProduct(product.id, form) : await api.createProduct(form)
      saved(result, editing ? 'Producto actualizado.' : 'Producto registrado.')
    } catch (error) { setError(error.message) } finally { submitting.current = false; setBusy(false) }
  }

  return <InventoryDrawer title={editing ? 'Editar producto' : 'Agregar producto'} kicker={editing ? 'Mantenimiento' : 'Nuevo registro'} close={close} busy={busy||uploading}>
    <form onSubmit={submit} aria-busy={busy}>
      <label>Nombre del producto<input value={form.name} onChange={(event) => field('name', event.target.value)} placeholder="Ej. Harina Blanca Flor 1 kg" required/></label>
      <label>Foto opcional · JPEG, PNG o WebP · máximo 2 MiB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||uploading} onChange={event=>photo(event.target.files[0])}/></label>
      {(form.imageUrl===undefined?product?.imageUrl:form.imageUrl)?<img className="product-photo-preview" src={form.imageUrl===undefined?product?.imageUrl:form.imageUrl} alt="Vista previa de la foto del producto"/>:<p>Sin foto · se mostrará una presentación neutra.</p>}
      <button className="secondary" type="button" disabled={busy||uploading} onClick={()=>field('imageUrl',null)}>Quitar foto</button>
      {uploading&&<p role="status">Cargando foto…</p>}
      <div className="form-row">
        <label>Categoría<select value={form.categoryId} onChange={(event) => field('categoryId', event.target.value)} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Unidad<select value={form.unit} onChange={(event) => field('unit', event.target.value)}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
      </div>
      <div className="form-row">
        <label>Costo<AmountInput min="0" max="99999999.99" step="0.01" value={form.cost} onChange={(event) => field('cost', event.target.value)} placeholder="0.00" required/></label>
        <label>Precio de venta<AmountInput min="0" max="99999999.99" step="0.01" value={form.price} onChange={(event) => field('price', event.target.value)} placeholder="0.00" required/></label>
      </div>
      <div className="form-row">
        {editing ? <div className="quantity-field inventory-current-stock">
          <span>Stock actual</span>
          <strong>{quantityLabel(product.stock, product.unit)}</strong>
        </div> : <div className="quantity-field">
          <span>Stock inicial</span>
          {fromPurchase ? <strong>0 · El stock se ingresará al recibir la compra.</strong>
            : <DecimalInput label="Stock inicial" value={form.initialStock} onChange={value=>field('initialStock',value)} disabled={busy}/>}
        </div>}
        <div className="quantity-field">
          <span>Stock mínimo para alerta</span>
          <DecimalInput label="Stock mínimo para alerta" describedBy="stock-alert-help" value={form.minimum} onChange={value=>field('minimum',value)} disabled={busy}/>
          <small className="muted" id="stock-alert-help">La alerta se activa cuando el stock físico llega a esta cantidad o baja de ella.</small>
        </div>
      </div>
      {editing && <small className="muted">Para cambiar las existencias, usa Ajustar stock e indica el motivo.</small>}
      <label className="access-toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => field('isActive', event.target.checked)}/><span><strong>Producto activo</strong></span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!categories.length && <p className="form-error" role="alert">El catálogo aún no tiene categorías disponibles.</p>}
      <button className="primary" disabled={busy || uploading || !categories.length}>{busy ? 'Guardando…' : fromPurchase ? 'Crear producto y volver a la compra' : 'Guardar producto'}</button>
    </form>
  </InventoryDrawer>
}

export function AdjustmentDrawer({ product, close, saved }) {
  const [form, setForm] = useState(() => ({ change: '', reason: '', requestId: crypto.randomUUID() }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const result = form.change.trim() && Number.isFinite(Number(form.change)) ? product.stock + Number(form.change) : product.stock

  function field(key, value) {
    setForm((current) => ({ ...current, [key]: value, requestId: crypto.randomUUID() }))
  }
  async function submit(event) {
    event.preventDefault()
    if (submitting.current || result < Number(product.held||0)) return
    if (!form.reason.trim()) { setError('Ingresa un motivo con al menos un carácter distinto de espacios.'); return }
    try {
      if (decimalUnits(form.change, { signed: true, label: 'La variación' }) === 0) throw new Error('Ingresa una variación distinta de cero.')
    } catch (error) { setError(error.message); return }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const response = await api.adjustInventory(product.id, form)
      saved(response.product, `Ajuste confirmado. Stock actual: ${response.product.stock}.`)
    } catch (error) { setError(error.message) } finally { submitting.current = false; setBusy(false) }
  }

  return <InventoryDrawer title="Ajustar stock" kicker={product.name} close={close} busy={busy}>
    <form onSubmit={submit} aria-busy={busy}>
      <div className="form-row"><label>Stock consultado<input value={product.stock} readOnly/></label><label>Saldo previsto<input value={Number(result.toFixed(2))} readOnly aria-invalid={result < Number(product.held||0)} aria-describedby={result < Number(product.held||0) ? 'negative-stock-warning' : undefined}/>{result < Number(product.held||0) && <span id="negative-stock-warning" className="form-error" role="alert">El saldo no puede ser negativo ni inferior a las unidades apartadas. Reduce la cantidad retirada.</span>}</label></div>
      <div className="quantity-field">Variación de existencias<DecimalInput label="Variación de existencias" name="change" value={form.change} signed onChange={(value) => field('change', value)} disabled={busy}/></div>
      <small className="muted">Usa un valor positivo para agregar unidades y uno negativo para retirarlas. El saldo se comprueba al guardar.</small>
      <label>Motivo<input value={form.reason} onChange={(event) => field('reason', event.target.value)} placeholder="Ej. Producto dañado" required/></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy || result < Number(product.held||0)}>{busy ? 'Guardando…' : 'Confirmar ajuste'}</button>
    </form>
  </InventoryDrawer>
}

const movementNames = { entry: 'Entrada', sale: 'Venta', adjustment: 'Ajuste manual' }
const movementDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' })

export function HistoryDrawer({ product, close }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError('')
    api.productHistory(product.id, controller.signal).then(setData).catch((error) => {
      if (!controller.signal.aborted) setError(error.message)
    })
    return () => controller.abort()
  }, [product.id, retry])

  return <InventoryDrawer title="Historial de stock" kicker={product.name} close={close}>
    <div className="inventory-history">
      {error ? <div><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div> : !data ? <Skeleton rows={4}/> : <>
        <p className="muted">Stock actual: {quantityLabel(data.product.stock, data.product.unit)} · Stock mínimo para alerta: {quantityLabel(data.product.minimum, data.product.unit)}</p>
        {!data.movements.length ? <EmptyState icon={<History/>} title="Sin movimientos" copy="Los movimientos de este producto aparecerán aquí."/> : data.movements.map((movement) => <article className="inventory-movement stock-movement" key={movement.id}>
          <header><strong>{movementNames[movement.type] ?? movement.type}</strong><strong className={movement.change < 0 ? 'stock-decrease' : 'stock-increase'}>{movement.change > 0 ? '+' : ''}{quantityLabel(movement.change, data.product.unit)}</strong></header>
          {movement.reason && movement.reason.trim() !== movementNames[movement.type] && <p>{movement.reason}</p>}
          <dl className="stock-balances"><div><dt>Saldo anterior</dt><dd>{movement.stockBefore == null ? '—' : quantityLabel(movement.stockBefore, data.product.unit)}</dd></div><div><dt>Saldo posterior</dt><dd>{movement.stockAfter == null ? '—' : quantityLabel(movement.stockAfter, data.product.unit)}</dd></div></dl>
          <footer><time dateTime={movement.createdAt}>{movementDate.format(new Date(movement.createdAt))}</time><span>Responsable: {movement.author || 'No registrado'}</span></footer>
        </article>)}
      </>}
    </div>
  </InventoryDrawer>
}

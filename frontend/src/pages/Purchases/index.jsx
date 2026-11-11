import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { decimalUnits } from '../../../../shared/numbers.mjs'
import DecimalInput from '../../components/ui/DecimalInput'
import AmountInput from '../../components/ui/AmountInput'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { InventoryDrawer, ProductDrawer } from '../Inventory/InventoryDrawers'
import { api } from '../../services/api'
import { currency,quantityLabel } from '../../utils/format'
import { useInventory } from '../../context/InventoryContext'
const purchaseLine = (product = null) => ({
  key: crypto.randomUUID(),
  productId: product?.id ?? '',
  query: product?.name ?? '',
  quantity: '1',
  cost: product ? String(product.cost) : '',
})
const emptySupplier = { name: '', ruc: '', phone: '', reference: '' }

function PurchaseProductField({ item, products, disabled, onSearch, onChoose, onCreate }) {
  const input = useRef(null)
  const resultsId = useId()
  const [view, setView] = useState(null)
  const term = item.query.trim().toLocaleLowerCase('es')
  const needsSelection = !item.productId && Boolean(item.query)
  const matches = view === 'all' ? products : products.filter(product => product.name.toLocaleLowerCase('es').includes(term))

  useEffect(() => {
    input.current?.setCustomValidity(needsSelection ? 'Selecciona un producto de la lista.' : '')
  }, [needsSelection])

  return <div className="purchase-product-field" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setView(null)
  }} onKeyDown={event => {
    if (event.key === 'Escape' && view) {
      event.stopPropagation()
      setView(null)
      input.current?.focus()
    }
  }}>
    <div className="purchase-product-controls">
      <label>Producto<input ref={input} type="search" required autoComplete="off"
        placeholder="Escribe el nombre del producto" value={item.query} disabled={disabled}
        onFocus={event => { if (item.productId) event.currentTarget.select() }}
        onChange={event => {
          onSearch(event.target.value)
          setView(event.target.value.trim() ? 'search' : null)
        }}/></label>
      <button type="button" className="secondary purchase-browse-products" disabled={disabled}
        aria-expanded={view === 'all'} aria-controls={resultsId}
        onClick={() => setView(view === 'all' ? null : 'all')}>
        Ver productos <ChevronDown aria-hidden="true"/>
      </button>
    </div>
    <div id={resultsId} hidden={!view}>
      {view && (matches.length > 0
        ? <ul className="purchase-product-results" aria-label={view === 'all' ? 'Todos los productos' : 'Productos encontrados'}>
          {matches.map(product => <li key={product.id}>
            <button type="button" disabled={disabled} onClick={() => {
              onChoose(product)
              setView(null)
              input.current?.focus()
            }}>{product.name}</button>
          </li>)}
        </ul>
        : <p className="purchase-product-empty" role="status">{view === 'all' ? 'Aún no hay productos registrados.' : 'No encontramos ese producto.'}</p>)}
    </div>
    <button type="button" className="text-btn purchase-create-product" disabled={disabled} onClick={onCreate}><Plus/>Crear producto nuevo</button>
  </div>
}

export default function Purchases({purchaseProduct}) {
  const [rows,setRows]=useState(null),[products,setProducts]=useState([]),[error,setError]=useState(''),[showPurchase,setShowPurchase]=useState(false),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const [received,setReceived]=useState({})
  const [notice, setNotice] = useState('')
  const [direct, setDirect] = useState(true)
  const [supplier, setSupplier] = useState(emptySupplier)
  const [newProductLine, setNewProductLine] = useState(null)
  const [items,setItems]=useState(() => [purchaseLine()])
  const {data: inventory, setRevision:refreshStock}=useInventory()
  useEffect(() => {
    if (!purchaseProduct) return
    setItems([purchaseLine(purchaseProduct)])
    setSupplier(emptySupplier)
    setDirect(false)
    setShowPurchase(true)
  }, [purchaseProduct])
  useEffect(()=>{let active=true;setRows(null);setError('');Promise.all([api.orders(),api.products()]).then(([orders,products])=>{if(active){setRows(orders);setProducts(products)}}).catch(error=>{if(active)setError(error.message)});return()=>{active=false}},[revision])
  async function perform(work, success) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await work()
      if (success) setNotice(success)
      setShowPurchase(false)
      setSelected(null)
      setRevision(value => value + 1)
      refreshStock(value => value + 1)
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }
  function openPurchase() {
    setItems([purchaseLine()])
    setError('')
    setSupplier(emptySupplier)
    setDirect(true)
    setShowPurchase(true)
  }
  function savePurchase(event) {
    event.preventDefault()
    if (items.some(item => !item.productId)) {
      setError('Selecciona un producto en cada línea de la compra.')
      return
    }
    const purchase = {
      supplierName: supplier.name, supplierRuc: supplier.ruc, supplierPhone: supplier.phone,
      items: items.map(({ productId, quantity, cost }) => ({ productId, quantity, cost })),
    }
    if (direct) {
      perform(() => api.registerDirectPurchase({ ...purchase, reference: supplier.reference }), 'Compra registrada e ingresada al inventario.')
    } else {
      perform(() => api.createOrder(purchase), 'Orden registrada como pendiente.')
    }
  }
  function updateLine(lineKey, changes) {
    setItems(current => current.map(item => item.key === lineKey ? { ...item, ...changes } : item))
  }
  function supplierField(event) {
    const { name, value } = event.target
    setSupplier(current => ({ ...current, [name]: value }))
  }
  function productSaved(product) {
    setProducts(current => [...current.filter(item => item.id !== product.id), product]
      .sort((a, b) => a.name.localeCompare(b.name, 'es')))
    setItems(current => current.map(item => item.key === newProductLine
      ? { ...item, productId: product.id, query: product.name, cost: item.cost || String(product.cost) }
      : item))
    setNewProductLine(null)
    refreshStock(value => value + 1)
  }
  return <div className="page purchases-page"><PageHeader title="Compras" kicker="Reposición" description="Compras en mayorista y órdenes pendientes" action={<button className="primary" onClick={openPurchase} aria-label="Registrar compra"><Plus/>Registrar compra</button>}/>
    {notice && <p className="form-success" role="status">{notice}</p>}
    {!showPurchase&&!selected&&error&&<p className="form-error" role="alert">{error}</p>}
    {rows===null?!error&&<p>Cargando órdenes…</p>:!rows.length?<Card><p>Aún no hay compras registradas.</p></Card>:rows.map(order=><Card key={order.id}><div className="card-head"><div><h3>{order.status === 'received' ? 'Compra' : 'Orden'} #{order.id} · {order.supplier_name}</h3><p>RUC {order.supplier_ruc} · {order.supplier_phone}</p></div><span>{({pending:'Pendiente',received:'Recibida',cancelled:'Anulada'})[order.status]}</span></div>
      {order.items.map(item=><p key={item.id}>{item.name}: {quantityLabel(item.quantity,item.unit)} · Recibido: {quantityLabel(item.received_quantity,item.unit)} · {currency(item.unit_cost)}</p>)}<strong>Total estimado: {currency(order.estimated_total)}</strong>
      {order.status==='pending'&&<div className="toolbar"><button className="primary" disabled={busy} onClick={()=>{setReceived({});setSelected(order)}}>Registrar recepción</button><button className="secondary" disabled={busy||order.items.some(item=>Number(item.received_quantity)>0)} onClick={()=>perform(()=>api.cancelOrder(order.id))}>Anular orden</button></div>}
    </Card>)}
    {showPurchase && newProductLine === null && <InventoryDrawer title="Registrar compra" kicker="Comercio y productos" close={() => setShowPurchase(false)} busy={busy}><form onSubmit={savePurchase}>
      <label>Razón social del comercio<input name="name" value={supplier.name} onChange={supplierField} required/></label>
      <div className="form-row">
        <label>RUC<input name="ruc" value={supplier.ruc} onChange={supplierField} required/></label>
        <label>Teléfono<input name="phone" value={supplier.phone} onChange={supplierField} required/></label>
      </div>
      {items.map((item, index) => <div key={item.key} className="purchase-line"
        role="group" aria-labelledby={'purchase-line-' + item.key}>
        <div className="purchase-line-heading">
          <h3 id={'purchase-line-' + item.key}>Producto {index + 1}</h3>
          {items.length > 1 && <button type="button" className="secondary purchase-remove-product" disabled={busy}
            aria-label={'Quitar producto ' + (index + 1) + ' de la compra'}
            onClick={() => setItems(current => current.length > 1 ? current.filter(line => line.key !== item.key) : current)}>
            <X aria-hidden="true"/>Quitar
          </button>}
        </div>
        <PurchaseProductField item={item} products={products} disabled={busy}
          onSearch={query => updateLine(item.key, { query, productId: '' })}
          onChoose={product => updateLine(item.key, { query: product.name, productId: product.id })}
          onCreate={() => setNewProductLine(item.key)}/>
        <div className="form-row">
          <div className="quantity-field">Cantidad<DecimalInput label={'Cantidad de la línea ' + (index + 1)}
            minUnits={1} value={item.quantity} onChange={quantity => updateLine(item.key, { quantity })} disabled={busy}/></div>
          <label>Costo unitario<AmountInput min=".01" step=".01" required value={item.cost}
            onChange={event => updateLine(item.key, { cost: event.target.value })}/></label>
        </div>
      </div>)}
      <button className="secondary" type="button" disabled={busy} onClick={() => {
        const line = purchaseLine()
        setItems(current => [...current, line])
      }}>Agregar otro producto</button>
      <fieldset className="purchase-reception">
        <legend>¿Ya recibiste la mercadería?</legend>
        <label><input type="radio" name="received" checked={direct} onChange={() => setDirect(true)} disabled={busy}/>Sí, ya la recibí</label>
        <label><input type="radio" name="received" checked={!direct} onChange={() => setDirect(false)} disabled={busy}/>Todavía no</label>
      </fieldset>
      {direct && <label>N.º de comprobante o referencia de recepción<input name="reference" value={supplier.reference} onChange={supplierField} required/></label>}
      <p>{direct ? 'Las cantidades recibidas se sumarán al inventario al guardar.' : 'La orden quedará pendiente hasta que registres la recepción.'}</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy||!items.length}>{direct ? 'Guardar compra e ingresar al inventario' : 'Guardar orden pendiente'}</button>
    </form></InventoryDrawer>}
    {showPurchase && newProductLine !== null && <ProductDrawer
      categories={inventory.categories}
      fromPurchase
      close={() => setNewProductLine(null)}
      saved={productSaved}
    />}
    {selected&&<InventoryDrawer title={'Recepción de orden #'+selected.id} close={()=>setSelected(null)} busy={busy}><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);const lines=selected.items.map(item=>({itemId:item.id,quantity:data.get('item-'+item.id)})).filter(item=>Number(item.quantity)>0);perform(()=>api.receiveOrder(selected.id,{reference:data.get('reference'),items:lines}))}}>
      <label>Referencia única de recepción<input name="reference" required/></label>
      {selected.items.map(item=><div className="quantity-field" key={item.id}>{item.name} · Saldo {quantityLabel(Number(item.quantity)-Number(item.received_quantity),item.unit)}<DecimalInput name={'item-'+item.id} label={'Cantidad recibida de '+item.name} maxUnits={decimalUnits(item.quantity)-decimalUnits(item.received_quantity)} required={false} value={received[item.id]??'0'} onChange={value=>setReceived(current=>({...current,[item.id]:value}))} disabled={busy}/></div>)}
      {error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>Confirmar recepción</button>
    </form></InventoryDrawer>}
  </div>
}


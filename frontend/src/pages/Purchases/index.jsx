import { useEffect,useState } from 'react'
import { Plus } from 'lucide-react'
import { decimalUnits } from '../../../../shared/numbers.mjs'
import DecimalInput from '../../components/ui/DecimalInput'
import AmountInput from '../../components/ui/AmountInput'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { InventoryDrawer, ProductDrawer } from '../Inventory/InventoryDrawers'
import { api } from '../../services/api'
import { currency,quantityLabel } from '../../utils/format'
import { useInventory } from '../../context/InventoryContext'
const emptyItem = { productId: '', quantity: '1', cost: '' }
const emptySupplier = { name: '', ruc: '', phone: '', reference: '' }

export default function Purchases({purchaseProduct}) {
  const [rows,setRows]=useState(null),[products,setProducts]=useState([]),[error,setError]=useState(''),[showPurchase,setShowPurchase]=useState(false),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const [received,setReceived]=useState({})
  const [notice, setNotice] = useState('')
  const [direct, setDirect] = useState(true)
  const [supplier, setSupplier] = useState(emptySupplier)
  const [newProductLine, setNewProductLine] = useState(null)
  const [items,setItems]=useState([emptyItem])
  const {data: inventory, setRevision:refreshStock}=useInventory()
  const [search,setSearch]=useState(''),[category,setCategory]=useState('Todos')
  useEffect(() => {
    if (!purchaseProduct) return
    setItems([{ productId: purchaseProduct.id, quantity: '1', cost: String(purchaseProduct.cost) }])
    setSupplier(emptySupplier)
    setSearch('')
    setCategory('Todos')
    setDirect(false)
    setShowPurchase(true)
  }, [purchaseProduct])
  const filtered=products.filter(product=>(category==='Todos'||category===product.category)&&product.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
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
    setItems([emptyItem])
    setSearch('')
    setCategory('Todos')
    setError('')
    setSupplier(emptySupplier)
    setDirect(true)
    setShowPurchase(true)
  }
  function savePurchase(event) {
    event.preventDefault()
    const purchase = { supplierName: supplier.name, supplierRuc: supplier.ruc, supplierPhone: supplier.phone, items }
    if (direct) {
      perform(() => api.registerDirectPurchase({ ...purchase, reference: supplier.reference }), 'Compra registrada e ingresada al inventario.')
    } else {
      perform(() => api.createOrder(purchase), 'Orden registrada como pendiente.')
    }
  }
  function field(index,key,value){setItems(items.map((item,i)=>i===index?{...item,[key]:value}:item))}
  function supplierField(event) {
    const { name, value } = event.target
    setSupplier(current => ({ ...current, [name]: value }))
  }
  function productSaved(product) {
    setProducts(current => [...current.filter(item => item.id !== product.id), product]
      .sort((a, b) => a.name.localeCompare(b.name, 'es')))
    setItems(current => current.map((item, index) => index === newProductLine
      ? { ...item, productId: product.id, cost: item.cost || String(product.cost) }
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
      <div className="form-row"><label>Filtrar productos por nombre<input value={search} onChange={event=>setSearch(event.target.value)}/></label><label>Categoría<select value={category} onChange={event=>setCategory(event.target.value)}>{['Todos',...new Set(products.map(product=>product.category))].map(category=><option key={category}>{category}</option>)}</select></label></div>{items.map((item,index)=><div key={index}><label>Producto<select required value={item.productId} onChange={event=>field(index,'productId',event.target.value)}><option value="">Selecciona</option>{products.filter(product=>filtered.some(candidate=>candidate.id===product.id)||Number(item.productId)===product.id).map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <button type="button" className="text-btn purchase-create-product" disabled={busy} onClick={() => setNewProductLine(index)}><Plus/>Crear producto nuevo</button>
      <div className="form-row"><div className="quantity-field">Cantidad<DecimalInput label={'Cantidad de la línea '+(index+1)} minUnits={1} value={item.quantity} onChange={value=>field(index,'quantity',value)} disabled={busy}/></div><label>Costo unitario<AmountInput min=".01" step=".01" required value={item.cost} onChange={event=>field(index,'cost',event.target.value)}/></label></div><button type="button" className="text-btn" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>Retirar línea</button></div>)}
      <button className="secondary" type="button" onClick={()=>setItems([...items,{productId:'',quantity:'1',cost:''}])}>Agregar línea</button>
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


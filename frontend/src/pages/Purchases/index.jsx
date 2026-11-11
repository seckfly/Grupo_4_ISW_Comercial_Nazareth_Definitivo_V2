import { useEffect,useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { InventoryDrawer } from '../Inventory/InventoryDrawers'
import { api } from '../../services/api'
import { currency,quantityLabel } from '../../utils/format'
import { useInventory } from '../../context/InventoryContext'
export default function Purchases() {
  const [rows,setRows]=useState(null),[products,setProducts]=useState([]),[error,setError]=useState(''),[editing,setEditing]=useState(false),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  const [items,setItems]=useState([{productId:'',quantity:'1',cost:''}])
  const {setRevision:refreshStock}=useInventory()
  useEffect(()=>{let active=true;setRows(null);setError('');Promise.all([api.orders(),api.products()]).then(([orders,products])=>{if(active){setRows(orders);setProducts(products)}}).catch(error=>{if(active)setError(error.message)});return()=>{active=false}},[revision])
  async function perform(work) {setBusy(true);setError('');try{await work();setEditing(false);setSelected(null);setRevision(value=>value+1);refreshStock(value=>value+1)}catch(error){setError(error.message)}finally{setBusy(false)}}
  function field(index,key,value){setItems(items.map((item,i)=>i===index?{...item,[key]:value}:item))}
  return <div className="page"><PageHeader title="Compras" kicker="Reposición" description="Órdenes y recepción de mercadería" action={<button className="primary" onClick={()=>{setItems([{productId:'',quantity:'1',cost:''}]);setEditing(true)}}><Plus/>Nueva orden</button>}/>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {rows===null?!error&&<p>Cargando órdenes…</p>:!rows.length?<Card><p>Aún no hay órdenes de compra.</p></Card>:rows.map(order=><Card key={order.id}><div className="card-head"><div><h3>Orden #{order.id} · {order.supplier_name}</h3><p>RUC {order.supplier_ruc} · {order.supplier_phone}</p></div><span>{({pending:'Pendiente',received:'Recibida',cancelled:'Anulada'})[order.status]}</span></div>
      {order.items.map(item=><p key={item.id}>{item.name}: {quantityLabel(item.quantity,item.unit)} · Recibido: {quantityLabel(item.received_quantity,item.unit)} · {currency(item.unit_cost)}</p>)}<strong>Total estimado: {currency(order.estimated_total)}</strong>
      {order.status==='pending'&&<div className="toolbar"><button className="primary" disabled={busy} onClick={()=>setSelected(order)}>Registrar recepción</button><button className="secondary" disabled={busy||order.items.some(item=>Number(item.received_quantity)>0)} onClick={()=>perform(()=>api.cancelOrder(order.id))}>Anular orden</button></div>}
    </Card>)}
    {editing&&<InventoryDrawer title="Nueva orden" kicker="Proveedor y productos" close={()=>setEditing(false)} busy={busy}><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);perform(()=>api.createOrder({supplierName:data.get('name'),supplierRuc:data.get('ruc'),supplierPhone:data.get('phone'),items}))}}>
      <label>Razón social<input name="name" required/></label><div className="form-row"><label>RUC<input name="ruc" required/></label><label>Teléfono<input name="phone" required/></label></div>
      {items.map((item,index)=><div key={index}><label>Producto<select required value={item.productId} onChange={event=>field(index,'productId',event.target.value)}><option value="">Selecciona</option>{products.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="form-row"><label>Cantidad<input type="number" min=".01" step=".01" required value={item.quantity} onChange={event=>field(index,'quantity',event.target.value)}/></label><label>Costo unitario<input type="number" min=".01" step=".01" required value={item.cost} onChange={event=>field(index,'cost',event.target.value)}/></label></div><button type="button" className="text-btn" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>Retirar línea</button></div>)}
      <button className="secondary" type="button" onClick={()=>setItems([...items,{productId:'',quantity:'1',cost:''}])}>Agregar línea</button>
      <p>El total se calcula en el servidor. Crear la orden no aumenta el stock.</p>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy||!items.length}>Guardar orden</button>
    </form></InventoryDrawer>}
    {selected&&<InventoryDrawer title={'Recepción de orden #'+selected.id} close={()=>setSelected(null)} busy={busy}><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);const lines=selected.items.map(item=>({itemId:item.id,quantity:data.get('item-'+item.id)})).filter(item=>Number(item.quantity)>0);perform(()=>api.receiveOrder(selected.id,{reference:data.get('reference'),items:lines}))}}>
      <label>Referencia única de recepción<input name="reference" required/></label>
      {selected.items.map(item=><label key={item.id}>{item.name} · Saldo {quantityLabel(Number(item.quantity)-Number(item.received_quantity),item.unit)}<input name={'item-'+item.id} type="number" min="0" max={Number(item.quantity)-Number(item.received_quantity)} step=".01" defaultValue="0"/></label>)}
      {error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>Confirmar recepción</button>
    </form></InventoryDrawer>}
  </div>
}


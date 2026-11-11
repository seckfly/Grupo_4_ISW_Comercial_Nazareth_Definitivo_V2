import { useEffect,useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { InventoryDrawer } from '../Inventory/InventoryDrawers'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useInventory } from '../../context/InventoryContext'
import { currency,quantityLabel } from '../../utils/format'
const names={pending:'Pendiente de confirmación',confirmed:'Apartado confirmado',cancelled:'Cancelada',rejected:'Rechazada',expired:'Vencida',collected:'Recogida y pagada'}
export default function Reservations({openSale}) {
  const {user}=useAuth(),{setRevision:refreshStock}=useInventory()
  const admin=user.role==='admin'
  const [rows,setRows]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[editing,setEditing]=useState(null),[items,setItems]=useState([]),[products,setProducts]=useState([])
  useEffect(()=>{let active=true;setError('');api.reservations().then(rows=>{if(active)setRows(rows)}).catch(error=>{if(active)setError(error.message)});return()=>{active=false}},[revision])
  async function act(id,input){if(busy)return;setBusy(true);setError('');try{await api.changeReservation(id,input);setEditing(null);setRevision(value=>value+1);refreshStock(value=>value+1)}catch(error){setError(error.message)}finally{setBusy(false)}}
  async function edit(row){setError('');try{setProducts(await api.products());setItems(row.items.map(item=>({productId:item.productId,quantity:String(item.quantity)})));setEditing(row)}catch(error){setError(error.message)}}
  function field(index,key,value){setItems(items.map((item,i)=>index===i?{...item,[key]:value}:item))}
  return <div className="page reservations-page"><PageHeader title="Reservas" kicker={admin?'Atención en tienda':'Mis solicitudes'} description="Solicitud, confirmación del apartado y recojo en tienda"/>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="secondary" disabled={busy} onClick={()=>setRevision(value=>value+1)}>Actualizar estados</button>
    {!rows?!error&&<p>Cargando solicitudes…</p>:!rows.length?<Card><p>Aún no hay solicitudes de separación.</p></Card>:rows.map(row=><Card key={row.id}>
      <div className="card-head"><div><p className="eyebrow">Código de recojo</p><h3>{row.pickup_code}</h3><p>{admin?row.customerName:'Tu solicitud'} · {names[row.status]||row.status}</p></div><strong>{currency(row.estimated_total)}</strong></div>
      <p>Vigencia hasta {new Date(row.pickup_deadline).toLocaleString('es-PE',{timeZone:'America/Lima'})} (Lima)</p>
      {row.items.map(item=><p key={item.productId}>{item.name} · {quantityLabel(item.quantity,item.unit)}</p>)}
      <div className="toolbar">{['pending','confirmed'].includes(row.status)&&<button className="secondary" disabled={busy} onClick={()=>act(row.id,{action:'cancel'})}>Cancelar</button>}
      {admin&&['pending','confirmed'].includes(row.status)&&<><button className="secondary" disabled={busy} onClick={()=>edit(row)}>Ajustar solicitud</button><button className="secondary" disabled={busy} onClick={()=>act(row.id,{action:'reject'})}>Rechazar</button></>}
      {admin&&row.status==='pending'&&<button className="primary" disabled={busy} onClick={()=>act(row.id,{action:'confirm'})}>Confirmar apartado</button>}
      {admin&&row.status==='confirmed'&&<button className="primary" disabled={busy} onClick={()=>openSale(row)}>Recoger y pagar</button>}</div>
      {row.status==='pending'&&<small>Esta solicitud todavía no aparta existencias ni registra un pago.</small>}
    </Card>)}
    {editing&&<InventoryDrawer title="Ajustar solicitud" close={()=>setEditing(null)} busy={busy}><form onSubmit={event=>{event.preventDefault();act(editing.id,{action:'edit',items})}}>
      <p>Al guardar se libera cualquier apartado anterior y la solicitud vuelve a Pendiente de confirmación.</p>
      {items.map((item,index)=><div className="form-row" key={index}><label>Producto<select value={item.productId} onChange={event=>field(index,'productId',event.target.value)} required><option value="">Selecciona</option>{products.map(product=><option value={product.id} key={product.id}>{product.name} · {product.unit}</option>)}</select></label><label>Cantidad<input type="number" min=".01" step=".01" value={item.quantity} onChange={event=>field(index,'quantity',event.target.value)} required/></label><button className="text-btn" type="button" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>Retirar producto</button></div>)}
      <button className="secondary" type="button" disabled={items.length>=3} onClick={()=>setItems([...items,{productId:'',quantity:'1'}])}>Agregar producto</button>
      {error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy||!items.length}>Guardar solicitud</button>
    </form></InventoryDrawer>}
  </div>
}


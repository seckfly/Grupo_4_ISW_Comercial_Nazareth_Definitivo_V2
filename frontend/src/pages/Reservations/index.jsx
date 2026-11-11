import { useEffect,useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { InventoryDrawer } from '../Inventory/InventoryDrawers'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useInventory } from '../../context/InventoryContext'
import { usesWholeQuantity } from '../../../../shared/numbers.mjs'
import DecimalInput from '../../components/ui/DecimalInput'
import { currency,quantityLabel } from '../../utils/format'
const names={pending:'Pendiente de confirmación',confirmed:'Apartado confirmado',cancelled:'Cancelada',rejected:'Rechazada',expired:'Vencida',collected:'Recogida y pagada'}
const isActive = row => row.status === 'pending' || row.status === 'confirmed'

const deadlineFormat = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short',
})

function ReservationCard({ row, admin, busy, onChange, onEdit, onPickup }) {
  const active = isActive(row)
  return <Card className="reservation-record">
    <header className="reservation-record-heading">
      <div>
        <p className="eyebrow">Código de recojo</p>
        <h3>{row.pickup_code}</h3>
      </div>
      <span className="reservation-status" data-status={row.status}>{names[row.status] || row.status}</span>
    </header>
    <dl className="reservation-record-meta">
      {admin && <div><dt>Cliente</dt><dd>{row.customerName}</dd></div>}
      <div><dt>{active ? 'Vigencia hasta' : 'Vigencia original'}</dt>
        <dd><time dateTime={row.pickup_deadline}>{deadlineFormat.format(new Date(row.pickup_deadline))}</time> <span>(Lima)</span></dd>
      </div>
    </dl>
    <table className="reservation-products" aria-label={'Productos de la reserva ' + row.pickup_code}>
      <thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th></tr></thead>
      <tbody>{row.items.map(item => <tr key={item.productId}>
        <th scope="row">{item.name}</th><td>{quantityLabel(item.quantity, item.unit)}</td>
      </tr>)}</tbody>
    </table>
    <div className="reservation-record-total"><span>Total estimado</span><strong>{currency(row.estimated_total)}</strong></div>
    {active && <div className="toolbar reservation-record-actions">
      <button className="secondary" disabled={busy} onClick={() => onChange(row.id, { action: 'cancel' })}>Cancelar</button>
      {admin && <>
        <button className="secondary" disabled={busy} onClick={() => onEdit(row)}>Ajustar solicitud</button>
        <button className="secondary" disabled={busy} onClick={() => onChange(row.id, { action: 'reject' })}>Rechazar</button>
        {row.status === 'pending'
          ? <button className="primary" disabled={busy} onClick={() => onChange(row.id, { action: 'confirm' })}>Confirmar apartado</button>
          : <button className="primary" disabled={busy} onClick={() => onPickup(row)}>Recoger y pagar</button>}
      </>}
    </div>}
    {row.status === 'pending' && <small className="reservation-record-note">Esta solicitud todavía no aparta existencias ni registra un pago.</small>}
  </Card>
}

export default function Reservations({openSale}) {
  const {user}=useAuth(),{setRevision:refreshStock}=useInventory()
  const admin=user.role==='admin'
  const [view, setView] = useState('active')
  const [rows,setRows]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[editing,setEditing]=useState(null),[items,setItems]=useState([]),[products,setProducts]=useState([])
  useEffect(()=>{let active=true;setError('');api.reservations().then(rows=>{if(active)setRows(rows)}).catch(error=>{if(active)setError(error.message)});return()=>{active=false}},[revision])
  async function act(id,input){if(busy)return;setBusy(true);setError('');try{await api.changeReservation(id,input);setEditing(null);setRevision(value=>value+1);refreshStock(value=>value+1)}catch(error){setError(error.message)}finally{setBusy(false)}}
  async function edit(row){setError('');try{setProducts(await api.products());setItems(row.items.map(item=>({productId:item.productId,quantity:String(item.quantity)})));setEditing(row)}catch(error){setError(error.message)}}
  function field(index,key,value){setItems(items.map((item,i)=>index===i?{...item,[key]:value}:item))}
  const shown = rows?.filter(row => view === 'active' ? isActive(row) : !isActive(row))
  return <div className="page reservations-page"><PageHeader title="Reservas" kicker={admin?'Atención en tienda':'Mis solicitudes'} description="Solicitud, confirmación del apartado y recojo en tienda"/>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div className="reservation-view-controls">
      <div className="seg" role="group" aria-label="Mostrar reservas">
        <button type="button" className={view === 'active' ? 'active' : ''} aria-pressed={view === 'active'} onClick={() => setView('active')}>Activas</button>
        <button type="button" className={view === 'history' ? 'active' : ''} aria-pressed={view === 'history'} onClick={() => setView('history')}>Historial</button>
      </div>
      <button className="secondary" disabled={busy} onClick={()=>setRevision(value=>value+1)}>Actualizar estados</button>
    </div>
    {!shown ? !error && <p>Cargando solicitudes…</p> :
      !shown.length ? <Card><p>{view === 'active' ? 'Aún no hay reservas activas.' : 'Aún no hay reservas en el historial.'}</p></Card> :
      shown.map(row => <ReservationCard key={row.id} row={row} admin={admin} busy={busy}
        onChange={act} onEdit={edit} onPickup={openSale}/>)}
    {editing&&<InventoryDrawer title="Ajustar solicitud" close={()=>setEditing(null)} busy={busy}><form onSubmit={event=>{event.preventDefault();act(editing.id,{action:'edit',items})}}>
      <p>Al guardar se libera cualquier apartado anterior y la solicitud vuelve a Pendiente de confirmación.</p>
      {items.map((item,index)=>{const whole=usesWholeQuantity(products.find(product=>product.id===Number(item.productId))?.unit);return <div className="form-row" key={index}><label>Producto<select value={item.productId} onChange={event=>field(index,'productId',event.target.value)} required><option value="">Selecciona</option>{products.map(product=><option value={product.id} key={product.id}>{product.name} · {product.unit}</option>)}</select></label><div className="quantity-field">Cantidad<DecimalInput label={'Cantidad de la línea '+(index+1)} minUnits={whole?100:1} whole={whole} value={item.quantity} onChange={value=>field(index,'quantity',value)} disabled={busy}/></div><button className="text-btn" type="button" onClick={()=>setItems(items.filter((_,i)=>i!==index))}>Retirar producto</button></div>})}
      <button className="secondary" type="button" disabled={items.length>=3} onClick={()=>setItems([...items,{productId:'',quantity:'1'}])}>Agregar producto</button>
      {error&&<p className="form-error" role="alert">{error}</p>}<button className="primary" disabled={busy||!items.length}>Guardar solicitud</button>
    </form></InventoryDrawer>}
  </div>
}


import { useEffect, useState } from 'react'
import { ArrowRight, BadgePercent, CalendarDays, Plus, Search, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { currency } from '../../utils/format'
import { promotionPrice } from '../../utils/promotion'

const statuses = { active: 'Activa', scheduled: 'Programada', paused: 'Pausada', finished: 'Finalizada' }
const dateInput=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):''
export default function Promotions() {
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [editing,setEditing]=useState(null)
  const [busy,setBusy]=useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [retry, setRetry] = useState(0)
  const admin = user.role === 'admin'
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.promotions().then(rows => { if (active) setItems(rows) })
      .catch(failure => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])
  const visible = items.filter(item => item.product.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
  return <div className={admin ? 'page promo-v5 admin-promo-v5' : 'page client-promo-dashboard'}>
    <PageHeader kicker={admin ? 'Crecimiento comercial' : 'Beneficios Nazareth'} title={admin ? 'Campañas' : 'Promociones para ti'}
      description="Consulta las campañas registradas y su vigencia."
      action={admin && <button className="primary promo-create" onClick={() => {setEditing(null);setCreating(true)}}><Plus/>Nueva campaña</button>}/>
    <section className={admin ? 'campaign-workspace' : 'promo-client-catalog'}>
      <header><div><p className="eyebrow">Control de campañas</p><h3>Campañas registradas</h3></div></header>
      {loading ? <div className="campaign-feedback"><Skeleton/></div> : error ? <div className="campaign-feedback"><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> :
      !items.length ? <div className="campaign-feedback"><EmptyState icon={<BadgePercent/>} title="Aún no hay campañas" copy="Las campañas registradas aparecerán aquí."/></div> : <>
        <label className="promo-search"><Search/><input aria-label="Buscar campaña" placeholder="Buscar campaña" value={query} onChange={event => setQuery(event.target.value)}/></label>
        {visible.map(item => <article className="campaign-row" key={item.id}>
          <div className="campaign-product">{item.imageUrl && <img src={item.imageUrl} alt={item.product}/>}<div><strong>{item.product}</strong><span>{item.discountType === 'percentage' ? item.discountValue + '%' : currency(item.discountValue)} menos</span></div></div>
          <div className="campaign-date"><strong><CalendarDays/> {dateInput(item.startDate)} — {dateInput(item.endDate)}</strong></div>
          <span className="campaign-status">{statuses[item.status] || item.status}</span>
          <p>Precio de esta campaña: {currency(promotionPrice(item.regularPrice,item.discountType,item.discountValue))}</p>
          {admin&&<div className="campaign-actions"><button disabled={busy} onClick={()=>{setEditing(item);setCreating(true)}}>Editar</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await api.updatePromotionStatus(item.id,item.status==='active'?'paused':'active');setRetry(v=>v+1)}catch(error){setError(error.message)}finally{setBusy(false)}}}>{item.status==='active'?'Pausar':'Activar'}</button><button disabled={busy} onClick={async()=>{setBusy(true);try{await api.deletePromotion(item.id);setRetry(v=>v+1)}catch(error){setError(error.message)}finally{setBusy(false)}}}>Eliminar</button></div>}
        </article>)}
        {!visible.length && <p>No hay coincidencias con la búsqueda.</p>}
      </>}
    </section>
    {creating && <CampaignModal campaign={editing} close={() => setCreating(false)} saved={()=>{setCreating(false);setRetry(v=>v+1)}}/>}
  </div>
}


function CampaignModal({ campaign, close, saved }) {
  const [discountType, setDiscountType] = useState(campaign?.discountType || 'percentage')
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [productId,setProductId]=useState(campaign?.productId||'')
  const [discountValue,setDiscountValue]=useState(campaign?.discountValue??'')
  let preview=null
  const product=products.find(product=>product.id===Number(productId))
  try {if(product||campaign)preview=promotionPrice(product?.regular_price??product?.sale_price??campaign.regularPrice,discountType,discountValue)}catch{}
  useEffect(() => {
    let active = true
    api.products().then(rows => { if (active) setProducts(rows) }).catch(failure => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [])
  const [busy,setBusy]=useState(false)
  async function save(event) {
    event.preventDefault();setError('');setBusy(true)
    const form=new FormData(event.currentTarget)
    const data={productId:Number(form.get('productId')),discountType,discountValue:form.get('discountValue'),startDate:form.get('startDate')+'T00:00:00-05:00',endDate:form.get('endDate')+'T23:59:59-05:00',status:form.get('status')}
    try{if(campaign)await api.updatePromotion(campaign.id,data);else await api.createPromotion(data);saved()}catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <div className="promo-modal campaign-modal-v5" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <form onSubmit={save}>
      <button type="button" onClick={close} aria-label="Cerrar campaña"><X/></button>
      {<>
        <p className="eyebrow">Nueva campaña</p><h3>{campaign ? 'Editar promoción' : 'Crear promoción'}</h3>
        <label>Producto<select name="productId" required value={productId} onChange={event=>setProductId(event.target.value)}><option value="">Selecciona un producto</option>{campaign&&!products.some(product=>product.id===campaign.productId)&&<option value={campaign.productId}>{campaign.product}</option>}{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
        <div><label>{discountType === 'percentage' ? 'Descuento (%)' : 'Descuento (S/)'}<input name="discountValue" type="number" min="0.01" step="0.01" max={discountType === 'percentage' ? 100 : 99999999.99} value={discountValue} onChange={event=>setDiscountValue(event.target.value)} required/></label>
          <label>Tipo<select name="discountType" value={discountType} onChange={(event) => setDiscountType(event.target.value)}><option value="percentage">Porcentaje</option><option value="fixed">Monto fijo</option></select></label></div>
        <div><label>Inicio<input name="startDate" type="date" defaultValue={dateInput(campaign?.startDate)} required/></label><label>Fin<input name="endDate" type="date" defaultValue={dateInput(campaign?.endDate)} required/></label></div>
        <label>Estado<select name="status" defaultValue={campaign?.status || 'scheduled'}><option value="active">Activa</option><option value="scheduled">Programada</option><option value="paused">Pausada</option><option value="finished">Finalizada</option></select></label>
        <p>Precio resultante: {preview===null?'Completa producto y descuento válido':currency(preview)}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{campaign ? 'Guardar cambios' : 'Crear campaña'} <ArrowRight/></button>
      </>}
    </form>
  </div>
}


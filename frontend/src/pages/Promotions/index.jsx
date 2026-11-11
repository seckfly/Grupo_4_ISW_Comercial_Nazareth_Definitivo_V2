import { useEffect, useState } from 'react'
import { ArrowRight, BadgePercent, CalendarDays, Plus, Search, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { currency } from '../../utils/format'

const statuses = { active: 'Activa', scheduled: 'Programada', paused: 'Pausada', finished: 'Finalizada' }
export default function Promotions() {
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
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
      action={admin && <button className="primary promo-create" onClick={() => setCreating(true)}><Plus/>Nueva campaña</button>}/>
    <section className={admin ? 'campaign-workspace' : 'promo-client-catalog'}>
      <header><div><p className="eyebrow">Control de campañas</p><h3>Campañas registradas</h3></div></header>
      {loading ? <div className="campaign-feedback"><Skeleton/></div> : error ? <div className="campaign-feedback"><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> :
      !items.length ? <div className="campaign-feedback"><EmptyState icon={<BadgePercent/>} title="Aún no hay campañas" copy="Las campañas registradas aparecerán aquí."/></div> : <>
        <label className="promo-search"><Search/><input aria-label="Buscar campaña" placeholder="Buscar campaña" value={query} onChange={event => setQuery(event.target.value)}/></label>
        {visible.map(item => <article className="campaign-row" key={item.id}>
          <div className="campaign-product">{item.imageUrl && <img src={item.imageUrl} alt={item.product}/>}<div><strong>{item.product}</strong><span>{item.discountType === 'percentage' ? item.discountValue + '%' : currency(item.discountValue)} menos</span></div></div>
          <div className="campaign-date"><strong><CalendarDays/> {String(item.startDate).slice(0, 10)} — {String(item.endDate).slice(0, 10)}</strong></div>
          <span className="campaign-status">{statuses[item.status] || item.status}</span>
        </article>)}
        {!visible.length && <p>No hay coincidencias con la búsqueda.</p>}
      </>}
    </section>
    {creating && <CampaignModal close={() => setCreating(false)}/>}
  </div>
}


function CampaignModal({ campaign, close }) {
  const [discountType, setDiscountType] = useState(campaign?.discountType || 'percentage')
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  useEffect(() => {
    let active = true
    api.products().then(rows => { if (active) setProducts(rows) }).catch(failure => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [])
  function save(event) {
    event.preventDefault()
    setError('El guardado de campañas aún no está disponible.')
  }
  return <div className="promo-modal campaign-modal-v5" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <form onSubmit={save}>
      <button type="button" onClick={close} aria-label="Cerrar campaña"><X/></button>
      {<>
        <p className="eyebrow">Nueva campaña</p><h3>{campaign ? 'Editar promoción' : 'Crear promoción'}</h3>
        <label>Producto<select name="productId" defaultValue={campaign?.productId || ''}><option value="">Selecciona un producto</option>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
        <div><label>{discountType === 'percentage' ? 'Descuento (%)' : 'Descuento (S/)'}<input name="discountValue" type="number" min="0.01" step="0.01" max={discountType === 'percentage' ? 100 : 99999999.99} defaultValue={campaign?.discountValue || ''} required/></label>
          <label>Tipo<select name="discountType" value={discountType} onChange={(event) => setDiscountType(event.target.value)}><option value="percentage">Porcentaje</option><option value="fixed">Monto fijo</option></select></label></div>
        <div><label>Inicio<input name="startDate" type="date" defaultValue={campaign?.startDate || ''} required/></label><label>Fin<input name="endDate" type="date" defaultValue={campaign?.endDate || ''} required/></label></div>
        <label>Estado<select name="status" defaultValue={campaign?.status || 'Programada'}><option>Activa</option><option>Programada</option><option>Pausada</option><option>Finalizada</option></select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="form-error" role="status">El guardado de campañas aún no está disponible.</p><button className="primary" disabled>{campaign ? 'Guardar cambios' : 'Crear campaña'} <ArrowRight/></button>
      </>}
    </form>
  </div>
}


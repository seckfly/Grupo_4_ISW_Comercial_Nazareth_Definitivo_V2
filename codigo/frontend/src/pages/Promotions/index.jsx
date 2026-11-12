import AmountInput from '../../components/ui/AmountInput'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, BadgePercent, CalendarDays, Plus, Search, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import ProductPicker from '../../components/ui/ProductPicker'
import OfferPrice from '../../components/ui/OfferPrice'
import { usePriceRefresh } from '../../hooks/usePriceRefresh'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { currency } from '../../utils/format'
import { promotionPrice } from '../../utils/promotion'

const statuses = { active: 'Activa', scheduled: 'Programada', paused: 'Pausada', finished: 'Finalizada' }
const dateInput=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):''
const campaignDateFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium' })
const campaignDate = value => campaignDateFormat.format(new Date(value))

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
  const refreshPrices = useCallback(async () => {
    try { setItems(await api.promotions()) } catch { /* Keep the last successful list. */ }
  }, [])
  usePriceRefresh(refreshPrices, !admin && !loading && !error)
  const visible = items.filter(item => item.product.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))

  async function updateCampaign(work) {
    setBusy(true)
    setError('')
    try {
      await work()
      setRetry(value => value + 1)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className={admin ? 'page promo-v5 admin-promo-v5' : 'page client-promo-dashboard'}>
    <PageHeader kicker={admin ? 'Crecimiento comercial' : 'Beneficios Nazareth'} title={admin ? 'Campañas' : 'Promociones para ti'}
      description={admin ? 'Consulta las campañas registradas y su vigencia.' : 'Encuentra ofertas para tu próxima visita a la tienda.'}
      action={admin && <button className="primary promo-create" onClick={() => { setEditing(null); setCreating(true) }}><Plus/>Nueva campaña</button>}/>
    <section className={admin ? 'campaign-workspace' : 'promo-client-catalog'}>
      <header><div>{admin && <p className="eyebrow">Control de campañas</p>}<h3>{admin ? 'Campañas registradas' : 'Ofertas vigentes'}</h3></div></header>
      {loading ? <div className="campaign-feedback"><Skeleton/></div> : <>
        {error && <div className="campaign-feedback"><p className="form-error" role="alert">{error}</p>
          <button className="secondary" onClick={() => setRetry(value => value + 1)}>Actualizar {admin ? 'campañas' : 'ofertas'}</button>
        </div>}
        {!items.length ? !error && <div className="campaign-feedback"><EmptyState icon={<BadgePercent/>}
          title={admin ? 'Aún no hay campañas' : 'Por ahora no hay ofertas vigentes'}
          copy={admin ? 'Las campañas registradas aparecerán aquí.' : 'Vuelve a consultar antes de tu próxima visita.'}/></div> : <>
          <label className="promo-search"><Search/><input aria-label={admin ? 'Buscar campaña' : 'Buscar producto en oferta'}
            placeholder={admin ? 'Buscar campaña' : 'Buscar producto en oferta'} value={query} onChange={event => setQuery(event.target.value)}/></label>
          {visible.map(item => {
            const price = item.currentPrice ?? promotionPrice(item.regularPrice, item.discountType, item.discountValue)
            const savings = Math.round((item.regularPrice - price) * 100) / 100
            return <article className="campaign-row" key={item.id}>
              <div className="campaign-product">{item.imageUrl && <img src={item.imageUrl} alt={item.product}/>}
                <div><strong>{item.product}</strong>{savings > 0 && <span>{admin ? currency(savings) + ' menos' : 'Ahorras ' + currency(savings)}</span>}
                  {admin && item.productActive === false && <span>Producto fuera del catálogo</span>}</div>
              </div>
              <div className="campaign-date"><CalendarDays aria-hidden="true"/>
                <span>{admin ? 'Vigencia' : 'Oferta válida'} <strong>{campaignDate(item.startDate)} – {campaignDate(item.endDate)}</strong></span>
              </div>
              {admin && <span className="campaign-status">{statuses[item.status] || item.status}</span>}
              <div className="campaign-price"><OfferPrice regularPrice={item.regularPrice} price={price}/></div>
              {admin && <div className="campaign-actions">
                <button type="button" disabled={busy} onClick={() => { setEditing(item); setCreating(true) }}>Editar</button>
                <button type="button" disabled={busy || (item.productActive === false && item.status !== 'active')} onClick={() => updateCampaign(() => api.updatePromotionStatus(item.id, item.status === 'active' ? 'paused' : 'active'))}>
                  {item.status === 'active' ? 'Pausar' : 'Activar'}
                </button>
                <button type="button" className="danger" disabled={busy} onClick={() => updateCampaign(() => api.deletePromotion(item.id))}>Eliminar</button>
              </div>}
            </article>
          })}
          {!visible.length && <p>{admin ? 'No hay coincidencias con la búsqueda.' : 'No encontramos ese producto en oferta.'}</p>}
        </>}
      </>}
    </section>
    {creating && <CampaignModal campaign={editing} close={() => setCreating(false)} saved={()=>{setCreating(false);setRetry(v=>v+1)}}/>}
  </div>
}


function CampaignModal({ campaign, close, saved }) {
  const [discountType, setDiscountType] = useState(campaign?.discountType || 'percentage')
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [selection, setSelection] = useState({ productId: campaign?.productId ?? '', query: campaign?.product ?? '' })
  const [discountValue,setDiscountValue]=useState(campaign?.discountValue??'')
  let preview=null
  const product = products.find(product => product.id === Number(selection.productId))
  const regularPrice = product?.regular_price ?? product?.sale_price ??
    (selection.productId === campaign?.productId ? campaign?.regularPrice : undefined)
  try { if (regularPrice !== undefined) preview = promotionPrice(regularPrice, discountType, discountValue) } catch {}
  useEffect(() => {
    let active = true
    api.products().then(rows => { if (active) setProducts(rows) }).catch(failure => { if (active) setError(failure.message) })
    return () => { active = false }
  }, [])
  const [busy,setBusy]=useState(false)
  const creation = useRef(null)
  async function save(event) {
    event.preventDefault()
    if (busy || !selection.productId) return
    setError('');setBusy(true)
    const form=new FormData(event.currentTarget)
    const data={productId:Number(selection.productId),discountType,discountValue:form.get('discountValue'),startDate:form.get('startDate')+'T00:00:00-05:00',endDate:form.get('endDate')+'T23:59:59-05:00',status:form.get('status')}
    try {
      if (campaign) await api.updatePromotion(campaign.id, data)
      else {
        const signature = JSON.stringify(data)
        if (creation.current?.signature !== signature) creation.current = { signature, id: crypto.randomUUID() }
        await api.createPromotion({ ...data, requestId: creation.current.id })
      }
      saved()
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  return <div className="promo-modal campaign-modal-v5" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <form onSubmit={save}>
      <button type="button" onClick={close} aria-label="Cerrar campaña"><X/></button>
      {<>
        <p className="eyebrow">Nueva campaña</p><h3>{campaign ? 'Editar promoción' : 'Crear promoción'}</h3>
        <ProductPicker productId={selection.productId} query={selection.query} products={products} disabled={busy}
          onSearch={query => setSelection({ query, productId: '' })}
          onChoose={product => setSelection({ query: product.name, productId: product.id })}/>
        <div><label>{discountType === 'percentage' ? 'Descuento (%)' : 'Descuento (S/)'}<AmountInput name="discountValue" min="0.01" step="0.01" max={discountType === 'percentage' ? 100 : 99999999.99} value={discountValue} onChange={event=>setDiscountValue(event.target.value)} required/></label>
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


import { decimalText, decimalUnits, lineAmount, MONEY_MAX_UNITS, quantityForUnit, usesWholeQuantity } from '../../../../shared/numbers.mjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Clock3, Heart, ListPlus, Minus, PackageCheck, Plus, Search, ShoppingBasket, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { currency, countLabel, quantityLabel } from '../../utils/format'
import { filterCatalog, toggleCatalogItem } from '../../utils/catalog'
import DecimalInput from '../../components/ui/DecimalInput'
import OfferPrice from '../../components/ui/OfferPrice'
import { usePriceRefresh } from '../../hooks/usePriceRefresh'

const catalogProduct = row => ({ ...row, price: Number(row.sale_price), stock: Number(row.current_stock), image: row.image_url })


const pickupDeadline = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short',
})

function ReservationConfirmation({ reservation }) {
  return <section className="reservation-confirmation" role="status" aria-label="Solicitud de reserva registrada">
    <p className="reservation-confirmation-state">Pendiente de confirmación</p>
    <div className="reservation-confirmation-code">
      <span>Código de recojo</span>
      <strong>{reservation.pickup_code}</strong>
    </div>
    <dl>
      <div><dt>Total estimado</dt><dd>{currency(reservation.estimated_total)}</dd></div>
      <div><dt>Vigencia hasta (Lima)</dt>
        <dd><time dateTime={reservation.pickup_deadline}>{pickupDeadline.format(new Date(reservation.pickup_deadline))}</time></dd>
      </div>
    </dl>
  </section>
}

export default function Products({onNavigate}){
  const {user}=useAuth()
  const [products,setProducts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let active=true;Promise.all([api.products(),api.preferences()]).then(([rows,prefs])=>{if(active){setProducts(rows.map(catalogProduct));setFavorites(prefs.favorites);setList(prefs.list)}}).catch(error=>{if(active)setError(error.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  const categories=['Todos',...new Set(products.map(product=>product.category))]
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('Todos')
  const [favorites,setFavorites]=useState([])
  const [list,setList]=useState([])
  const results=useMemo(()=>filterCatalog(products,query,category),[products,query,category])
  const chosen=products.filter(product=>list.includes(product.id))
  const [quantities,setQuantities]=useState({}),[requestId,setRequestId]=useState(()=>crypto.randomUUID()),[created,setCreated]=useState(null),[sending,setSending]=useState(false)
  const quantity = product => quantities[product.id] ?? '1'
  function validQuantity(product) {
    try { return quantityForUnit(quantity(product), product.unit) > 0 }
    catch { return false }
  }
  const invalidQuantity = chosen.some(product => !validQuantity(product))
  let totalCents = null
  if (!invalidQuantity) {
    try {
      const sum = chosen.reduce((amount, product) =>
        amount + lineAmount(quantityForUnit(quantity(product), product.unit), decimalUnits(product.price)), 0)
      if (sum <= MONEY_MAX_UNITS) totalCents = sum
    } catch { /* Keep the request disabled if its amount exceeds the supported range. */ }
  }
  const refreshPrices = useCallback(async () => {
    try {
      setProducts((await api.products()).map(catalogProduct))
      return true
    } catch { return false }
  }, [])
  usePriceRefresh(refreshPrices, !loading && products.length > 0)
  function updateQuantity(id, value) {
    setQuantities(current => ({ ...current, [id]: value }))
    setCreated(null)
    setRequestId(crypto.randomUUID())
  }
  async function separate() {
    if (sending || created || totalCents === null || !chosen.length) return
    setSending(true)
    setError('')
    try {
      const saved = await api.requestReservation({ requestId, expectedTotal: decimalText(totalCents),
        items: chosen.map(product => ({ productId: product.id, quantity: quantity(product),
          expectedUnitPrice: decimalText(decimalUnits(product.price)) })) })
      setCreated(saved)
    } catch (error) {
      const pricesUpdated = error.status !== 409 || await refreshPrices()
      setError(pricesUpdated ? error.message : 'No se pudo actualizar el catálogo. Recarga la página antes de enviar tu solicitud.')
    } finally { setSending(false) }
  }
  const [saving,setSaving]=useState(false)
  async function saveSelection(nextFavorites,nextList){if(saving||loading||sending)return;setSaving(true);setError('');try{const saved=await api.savePreferences({favorites:nextFavorites,list:nextList});setFavorites(saved.favorites);setList(saved.list)}catch(error){setError(error.message)}finally{setSaving(false)}}
  function toggleFavorite(id){saveSelection(toggleCatalogItem(favorites,id),list)}
  function toggleList(id){if(saving||loading||sending)return;const next=toggleCatalogItem(list,id);if(next.length>3){setError('La solicitud admite hasta tres productos distintos. Retira un producto de Mi lista.');return}setCreated(null);setRequestId(crypto.randomUUID());saveSelection(favorites,next)}
  return <div className="page product-catalog-page">
    <section className="catalog-hero"><div><p className="eyebrow">Catálogo de la tienda</p><h2>Lo de siempre,<br/><em>más fácil de encontrar.</em></h2><p className="catalog-hero-description">Arma tu lista y solicita una separación para recoger en tienda.</p></div><article><span><Sparkles/> {user.name}</span><strong>{countLabel(products.length,'producto disponible','productos disponibles')}</strong><button onClick={()=>document.querySelector('.catalog-products')?.scrollIntoView({behavior:'smooth'})}>Explorar catálogo <i><ArrowRight/></i></button></article></section>
    <section className="catalog-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar arroz, bebidas, limpieza…"/>{query&&<button onClick={()=>setQuery('')} aria-label="Limpiar búsqueda"><X/></button>}</label><div>{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div></section>
    <div className="catalog-layout"><section className="catalog-products"><header><div><p className="eyebrow">Disponibles en Nazareth</p><h3>{countLabel(results.length, 'producto', 'productos')}</h3></div></header>{loading&&<p>Cargando catálogo…</p>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="catalog-photo-grid">{results.map(product=><article key={product.id}><div className="product-photo">{product.image?<img src={product.image} alt={product.name}/>:<span className="photo-neutral" aria-label="Producto sin foto">{product.name[0]}</span>}{product.badge&&<span>{product.badge}</span>}<button className={favorites.includes(product.id)?'active':''} onClick={()=>toggleFavorite(product.id)} aria-label="Guardar como favorito"><Heart/></button></div><div className="product-copy"><h4>{product.name}</h4><small className="catalog-product-meta"><span>{product.category}</span><span className="catalog-product-stock">{quantityLabel(product.stock,product.unit)} en tienda</span></small><div><OfferPrice regularPrice={product.regular_price} price={product.price}/><button className={list.includes(product.id)?'added':''} onClick={()=>toggleList(product.id)}>{list.includes(product.id)?<><Check/>En mi lista</>:<><Plus/>Añadir</>}</button></div></div></article>)}</div>{!loading&&!error&&!results.length&&<div className="catalog-empty"><Search/><h3>No encontramos ese producto</h3><p>Prueba con otra palabra o revisa todas las categorías.</p><button onClick={()=>{setQuery('');setCategory('Todos')}}>Ver todo el catálogo</button></div>}</section>
      <aside className="shopping-list-panel"><header><span><ShoppingBasket/></span><div><p className="eyebrow">Tu próxima visita</p><h3>Mi lista</h3></div><b>{chosen.length}</b></header>{chosen.length?<div className="shopping-list-lines">{chosen.map(product=><article key={product.id}>{product.image?<img src={product.image} alt=""/>:<span className="shopping-list-image-placeholder" aria-hidden="true">{product.name[0]}</span>}<div><strong>{product.name}</strong><OfferPrice regularPrice={product.regular_price} price={product.price} unit={product.unit}/><span className="shopping-list-quantity">Cantidad ({product.unit})</span><DecimalInput label={'Cantidad para separar '+product.name} whole={usesWholeQuantity(product.unit)} minUnits={usesWholeQuantity(product.unit)?100:1} value={quantity(product)} onChange={value=>updateQuantity(product.id,value)} disabled={sending}/>{!validQuantity(product)&&<small className="shopping-list-quantity-error">{usesWholeQuantity(product.unit)?'Ingresa una cantidad entera mayor que cero.':'Ingresa una cantidad positiva de hasta dos decimales.'}</small>}</div><button type="button" className="shopping-list-remove" aria-label={'Retirar '+product.name+' de Mi lista'} disabled={saving||sending} onClick={()=>toggleList(product.id)}><X/></button></article>)}</div>:<div className="shopping-list-empty"><ListPlus/><strong>Tu lista está vacía</strong><p>Añade productos para no olvidar nada en tu próxima visita.</p></div>}<footer><div className="shopping-list-total"><span>Total estimado</span><strong>{totalCents===null?'—':currency(totalCents / 100)}</strong></div><button disabled={sending||saving||loading||!chosen.length||chosen.length>3||Boolean(created)||totalCents===null} onClick={separate}><PackageCheck/>{sending?'Enviando…':'Solicitar separación'} <i><ArrowRight/></i></button><small><Clock3/> La solicitud no aparta stock hasta su confirmación en tienda.</small>{error&&<p className="form-error" role="alert">{error}</p>}{created && <ReservationConfirmation reservation={created}/>}<button className="secondary" onClick={()=>onNavigate?.('Reservas')}>Ver mis solicitudes</button></footer></aside>
    </div>
  </div>
}


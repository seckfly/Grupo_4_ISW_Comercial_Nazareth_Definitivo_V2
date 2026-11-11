import { useMemo, useState } from 'react'
import { ArrowRight, Check, Clock3, Heart, ListPlus, Minus, PackageCheck, Plus, Search, ShoppingBasket, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { products } from '../../services/mockData'
import { currency, countLabel } from '../../utils/format'
import { createReservation, filterCatalog, toggleCatalogItem } from '../../utils/catalog'

const categories=['Todos','Abarrotes','Bebidas','Lácteos','Conservas','Limpieza']

export default function Products(){
  const {user}=useAuth()
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('Todos')
  const [favorites,setFavorites]=useState(()=>JSON.parse(localStorage.getItem('nazareth_favorites')||'[]'))
  const [list,setList]=useState(()=>JSON.parse(localStorage.getItem('nazareth_shopping_list')||'[]'))
  const [reservation,setReservation]=useState(null)
  const results=useMemo(()=>filterCatalog(products,query,category),[query,category])
  const chosen=products.filter(product=>list.includes(product.id))
  const total=chosen.reduce((sum,product)=>sum+product.price,0)
  function toggleFavorite(id){setFavorites(current=>{const next=toggleCatalogItem(current,id);localStorage.setItem('nazareth_favorites',JSON.stringify(next));return next})}
  function toggleList(id){setList(current=>{const next=toggleCatalogItem(current,id);localStorage.setItem('nazareth_shopping_list',JSON.stringify(next));setReservation(null);return next})}
  function separate(){const next=createReservation(chosen,user.name);localStorage.setItem('nazareth_reservation',JSON.stringify(next));setReservation(next)}
  return <div className="page product-catalog-page">
    <section className="catalog-hero"><div><p className="eyebrow">Catálogo de la tienda</p><h2>Lo de siempre,<br/><em>más fácil de encontrar.</em></h2><p>Consulta precios y disponibilidad antes de salir. Guarda productos y arma una lista para tu próxima visita.</p></div><article><span><Sparkles/> Selección para Rosa</span><strong>8 productos disponibles hoy</strong><p>Precios actualizados a las 10:45 a. m.</p><button onClick={()=>document.querySelector('.catalog-products')?.scrollIntoView({behavior:'smooth'})}>Explorar catálogo <i><ArrowRight/></i></button></article></section>
    <section className="catalog-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar arroz, bebidas, limpieza…"/>{query&&<button onClick={()=>setQuery('')} aria-label="Limpiar búsqueda"><X/></button>}</label><div>{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div></section>
    <div className="catalog-layout"><section className="catalog-products"><header><div><p className="eyebrow">Disponibles en Nazareth</p><h3>{countLabel(results.length, 'producto', 'productos')}</h3></div><span>Stock en tiempo real</span></header><div className="catalog-photo-grid">{results.map(product=><article key={product.id}><div className="product-photo"><img src={product.image} alt={`${product.name} disponible en Comercial Nazareth`}/>{product.badge&&<span>{product.badge}</span>}<button className={favorites.includes(product.id)?'active':''} onClick={()=>toggleFavorite(product.id)} aria-label="Guardar como favorito"><Heart/></button></div><div className="product-copy"><small>{product.category} · {product.stock} en tienda</small><h4>{product.name}</h4><div><strong>{currency(product.price)}</strong><button className={list.includes(product.id)?'added':''} onClick={()=>toggleList(product.id)}>{list.includes(product.id)?<><Check/>En mi lista</>:<><Plus/>Añadir</>}</button></div></div></article>)}</div>{!results.length&&<div className="catalog-empty"><Search/><h3>No encontramos ese producto</h3><p>Prueba con otra palabra o revisa todas las categorías.</p><button onClick={()=>{setQuery('');setCategory('Todos')}}>Ver todo el catálogo</button></div>}</section>
      <aside className="shopping-list-panel"><header><span><ShoppingBasket/></span><div><p className="eyebrow">Tu próxima visita</p><h3>Mi lista</h3></div><b>{chosen.length}</b></header>{reservation?<div className="reservation-success"><span><Check/></span><p className="eyebrow">Solicitud enviada</p><h4>Separaremos tu pedido</h4><p>La tienda revisará las existencias y te confirmará por WhatsApp.</p><div><small>Código de recojo</small><strong>{reservation.code}</strong></div><ul><li>{countLabel(reservation.items, 'producto', 'productos')}</li><li>{currency(reservation.total)}</li></ul><button onClick={()=>setReservation(null)}>Editar mi lista</button></div>:chosen.length?<div className="shopping-list-lines">{chosen.map(product=><article key={product.id}><img src={product.image} alt=""/><div><strong>{product.name}</strong><small>{currency(product.price)} · 1 unidad</small></div><button onClick={()=>toggleList(product.id)}><Minus/></button></article>)}</div>:<div className="shopping-list-empty"><ListPlus/><strong>Tu lista está vacía</strong><p>Añade productos para no olvidar nada en tu próxima visita.</p></div>}<footer><div><span>Total estimado</span><strong>{currency(total)}</strong></div><button disabled={!chosen.length||Boolean(reservation)} onClick={separate}>{reservation?<><Check/>Solicitud enviada</>:<><PackageCheck/>Separar en tienda <i><ArrowRight/></i></>}</button><small><Clock3/> Confirmación por WhatsApp en 5–10 minutos.</small></footer></aside>
    </div>
  </div>
}


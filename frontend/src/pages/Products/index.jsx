import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Clock3, Heart, ListPlus, Minus, PackageCheck, Plus, Search, ShoppingBasket, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { currency, countLabel, quantityLabel } from '../../utils/format'
import { filterCatalog, toggleCatalogItem } from '../../utils/catalog'


export default function Products(){
  const {user}=useAuth()
  const [products,setProducts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let active=true;api.products().then(rows=>{if(active)setProducts(rows.map(row=>({...row,price:Number(row.sale_price),stock:Number(row.current_stock),image:row.image_url})))}).catch(error=>{if(active)setError(error.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[])
  const categories=['Todos',...new Set(products.map(product=>product.category))]
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('Todos')
  const [favorites,setFavorites]=useState(()=>JSON.parse(localStorage.getItem('nazareth_favorites')||'[]'))
  const [list,setList]=useState(()=>JSON.parse(localStorage.getItem('nazareth_shopping_list')||'[]'))
  const results=useMemo(()=>filterCatalog(products,query,category),[products,query,category])
  const chosen=products.filter(product=>list.includes(product.id))
  const total=chosen.reduce((sum,product)=>sum+product.price,0)
  function toggleFavorite(id){setFavorites(current=>{const next=toggleCatalogItem(current,id);localStorage.setItem('nazareth_favorites',JSON.stringify(next));return next})}
  function toggleList(id){setList(current=>{const next=toggleCatalogItem(current,id);localStorage.setItem('nazareth_shopping_list',JSON.stringify(next));return next})}
  return <div className="page product-catalog-page">
    <section className="catalog-hero"><div><p className="eyebrow">Catálogo de la tienda</p><h2>Lo de siempre,<br/><em>más fácil de encontrar.</em></h2><p>Consulta precios y disponibilidad antes de salir. Guarda productos y arma una lista para tu próxima visita.</p></div><article><span><Sparkles/> {user.name}</span><strong>{countLabel(products.length,'producto disponible','productos disponibles')}</strong><p>Cat?logo registrado</p><button onClick={()=>document.querySelector('.catalog-products')?.scrollIntoView({behavior:'smooth'})}>Explorar catálogo <i><ArrowRight/></i></button></article></section>
    <section className="catalog-toolbar"><label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar arroz, bebidas, limpieza…"/>{query&&<button onClick={()=>setQuery('')} aria-label="Limpiar búsqueda"><X/></button>}</label><div>{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div></section>
    <div className="catalog-layout"><section className="catalog-products"><header><div><p className="eyebrow">Disponibles en Nazareth</p><h3>{countLabel(results.length, 'producto', 'productos')}</h3></div><span>Stock consultado</span></header>{loading&&<p>Cargando cat?logo?</p>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="catalog-photo-grid">{results.map(product=><article key={product.id}><div className="product-photo">{product.image&&<img src={product.image} alt={product.name}/>}{product.badge&&<span>{product.badge}</span>}<button className={favorites.includes(product.id)?'active':''} onClick={()=>toggleFavorite(product.id)} aria-label="Guardar como favorito"><Heart/></button></div><div className="product-copy"><small>{product.category} · {quantityLabel(product.stock,product.unit)} en tienda</small><h4>{product.name}</h4><div><strong>{currency(product.price)}</strong><button className={list.includes(product.id)?'added':''} onClick={()=>toggleList(product.id)}>{list.includes(product.id)?<><Check/>En mi lista</>:<><Plus/>Añadir</>}</button></div></div></article>)}</div>{!loading&&!error&&!results.length&&<div className="catalog-empty"><Search/><h3>No encontramos ese producto</h3><p>Prueba con otra palabra o revisa todas las categorías.</p><button onClick={()=>{setQuery('');setCategory('Todos')}}>Ver todo el catálogo</button></div>}</section>
      <aside className="shopping-list-panel"><header><span><ShoppingBasket/></span><div><p className="eyebrow">Tu próxima visita</p><h3>Mi lista</h3></div><b>{chosen.length}</b></header>{chosen.length?<div className="shopping-list-lines">{chosen.map(product=><article key={product.id}>{product.image&&<img src={product.image} alt=""/>}<div><strong>{product.name}</strong><small>{currency(product.price)} · 1 unidad</small></div><button onClick={()=>toggleList(product.id)}><Minus/></button></article>)}</div>:<div className="shopping-list-empty"><ListPlus/><strong>Tu lista está vacía</strong><p>Añade productos para no olvidar nada en tu próxima visita.</p></div>}<footer><div><span>Total estimado</span><strong>{currency(total)}</strong></div><button disabled title="La reserva en tienda a?n no est? disponible"><PackageCheck/>Reserva no disponible <i><ArrowRight/></i></button><small><Clock3/> Confirmación por WhatsApp en 5–10 minutos.</small></footer></aside>
    </div>
  </div>
}


import { useEffect, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { api } from '../../services/api'
import { currency } from '../../utils/format'
export default function Household() {
  const [products,setProducts]=useState(null),[error,setError]=useState(''),[plan,setPlan]=useState([])
  useEffect(()=>{let active=true;api.products().then(rows=>{if(active)setProducts(rows)}).catch(error=>{if(active)setError(error.message)});return()=>{active=false}},[])
  return <div className="page household-page"><PageHeader title="Mi hogar" description="Prepara una lista personal con el catálogo registrado."/>
    <div className="household-layout"><Card className="replenishment-board"><h3>Productos disponibles</h3>{error?<p role="alert">{error}</p>:!products?<p>Cargando catálogo…</p>:products.length?products.map(product=><article key={product.id}><div><strong>{product.name}</strong><span>{currency(product.sale_price)}</span></div><button className="secondary" onClick={()=>setPlan(current=>current.includes(product.id)?current.filter(id=>id!==product.id):[...current,product.id])}>{plan.includes(product.id)?'Retirar':'Añadir'}</button></article>):<p>Aún no hay productos registrados.</p>}</Card>
    <Card className="home-plan"><h3>Lista del hogar</h3><p>Lista personal de esta sesión; no es una reserva en tienda.</p>{(products||[]).filter(product=>plan.includes(product.id)).map(product=><p key={product.id}>{product.name} · {currency(product.sale_price)}</p>)}<strong>Total estimado: {currency((products||[]).filter(product=>plan.includes(product.id)).reduce((sum,product)=>sum+Number(product.sale_price),0))}</strong></Card></div>
    <Card><h3>Ritmo de consumo y reposición</h3><p>Aún no hay datos suficientes.</p></Card></div>
}


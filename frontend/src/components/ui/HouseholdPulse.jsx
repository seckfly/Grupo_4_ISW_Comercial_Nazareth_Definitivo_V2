import { BarChart3, ChevronRight, Droplets, Home, Leaf, ShoppingBasket } from 'lucide-react'

export default function HouseholdPulse(){
  return <section className="household-pulse">
    <article className="household-intro"><span><Home/></span><p className="eyebrow">Nuevo · Mi hogar</p><h3>Una mirada clara a lo que consumes.</h3><p>Organizamos tus compras por uso para ayudarte a reponer a tiempo y cuidar el presupuesto semanal.</p><button>Configurar mi hogar <i><ChevronRight/></i></button></article>
    <article className="category-rhythm"><header><div><p className="eyebrow">Ritmo de consumo</p><h4>Próximas reposiciones</h4></div><BarChart3/></header><div><span><i className="fill-78"/><b>Abarrotes</b><small>4–6 días</small></span><span><i className="fill-54"/><b>Lácteos</b><small>8 días</small></span><span><i className="fill-36"/><b>Limpieza</b><small>12 días</small></span></div></article>
    <article className="household-impact"><div><span><Leaf/></span><div><small>Compras planificadas</small><strong>3 visitas evitadas</strong></div></div><div><span><Droplets/></span><div><small>Productos esenciales</small><strong>92% cubiertos</strong></div></div><div><span><ShoppingBasket/></span><div><small>Presupuesto semanal</small><strong>S/ 86.40 de S/ 110</strong></div></div></article>
  </section>
}


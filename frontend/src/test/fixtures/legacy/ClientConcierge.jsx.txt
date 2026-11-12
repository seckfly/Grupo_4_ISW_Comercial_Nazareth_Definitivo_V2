import { useState } from 'react'
import { ArrowRight, BellRing, Check, Clock3, MapPin, MessageCircle, PackageCheck, Plus, ShoppingBag, Star, Target } from 'lucide-react'
import { products } from '../../services/mockData'
import { currency } from '../../utils/format'
import HouseholdPulse from './HouseholdPulse'

export default function ClientConcierge(){
  const [reminder,setReminder]=useState(false)
  const [reserved,setReserved]=useState([])
  const picks=products.slice(0,4)
  function reserve(id){setReserved(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id])}
  return <section className="client-concierge">
    <div className="client-section-head"><div><p className="eyebrow">Diseñado alrededor de tus compras</p><h3>Tu semana en Nazareth</h3></div><button>Ver planificación <ArrowRight/></button></div>
    <div className="concierge-bento">
      <article className="next-visit-card"><div className="visit-photo"><img src="/products/arroz.jpg" alt="Productos de abarrotes preparados para una próxima compra"/><span>Próxima compra sugerida</span></div><div className="visit-copy"><p className="eyebrow">Martes · 5:30 p. m.</p><h4>Tu canasta puede estar lista cuando llegues.</h4><p>Según tu ritmo habitual, arroz, leche y azúcar podrían terminarse esta semana.</p><div><button>Revisar canasta <i><ArrowRight/></i></button><button className={reminder?'active':''} onClick={()=>setReminder(!reminder)}>{reminder?<Check/>:<BellRing/>}{reminder?'Recordatorio activo':'Recordarme'}</button></div></div></article>
      <article className="points-journey"><header><span><Target/></span><div><p className="eyebrow">Meta de agosto</p><strong>60 puntos para tu premio</strong></div><b>80%</b></header><div className="journey-track"><i/><span className="step done">100</span><span className="step done">200</span><span className="step current">240</span><span className="step">300</span></div><p>Una compra aproximada de <b>S/ 30</b> te lleva al siguiente beneficio.</p></article>
      <article className="client-pick-card"><header><div><p className="eyebrow">Reposición inteligente</p><h4>Podrías necesitar</h4></div><span><Star/> Para ti</span></header><div className="mini-picks">{picks.map(product=><button key={product.id} onClick={()=>reserve(product.id)}><img src={product.image} alt={product.name}/><div><strong>{product.name}</strong><small>{currency(product.price)}</small></div><i className={reserved.includes(product.id)?'selected':''}>{reserved.includes(product.id)?<Check/>:<Plus/>}</i></button>)}</div></article>
      <article className="service-dock"><p className="eyebrow">Nazareth cerca de ti</p><h4>Todo resuelto<br/><em>sin perder tiempo.</em></h4><button><span><MessageCircle/></span><div><strong>Pedido por WhatsApp</strong><small>Respuesta en 5–10 min</small></div><ArrowRight/></button><button><span><PackageCheck/></span><div><strong>Separar productos</strong><small>Recoge hasta las 8:30 p. m.</small></div><ArrowRight/></button><footer><MapPin/>Ascope, La Libertad <span><Clock3/>Abierto</span></footer></article>
    </div>
    <section className="client-activity-strip"><div><span><ShoppingBag/></span><div><small>Última compra</small><strong>Hoy · 12:42</strong></div></div><i/><div><b>+38</b><div><small>Puntos ganados</small><strong>Por 4 productos</strong></div></div><i/><div><b>S/ 5.60</b><div><small>Ahorro aplicado</small><strong>Promoción de bebidas</strong></div></div><button>Ver detalle <ArrowRight/></button></section>
    <HouseholdPulse/>
  </section>
}

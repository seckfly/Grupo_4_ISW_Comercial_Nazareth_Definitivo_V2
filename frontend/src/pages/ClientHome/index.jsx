import { useState } from 'react'
import { ArrowRight, Check, ChevronRight, Clock3, Heart, PackageCheck, ReceiptText, ShoppingBag } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { products } from '../../services/mockData'
import { currency } from '../../utils/format'
import { useLiveDateTime } from '../../hooks/useLiveDateTime'

const purchases=[{date:'Hoy, 12:42',items:'Arroz, aceite y 2 más',total:38.4,pay:'Yape'},{date:'18 ago, 17:26',items:'Leche Gloria × 3',total:13.5,pay:'Efectivo'},{date:'09 ago, 10:12',items:'Limpieza y conservas',total:42.8,pay:'Plin'}]

export default function ClientHome({onNavigate}){
  const {user}=useAuth()
  const storeTime=useLiveDateTime()
  const [prepared,setPrepared]=useState(false)
  const [saved,setSaved]=useState(true)
  return <div className="page client-summary-minimal">
    <section className="minimal-welcome">
      <div><p className="summary-date">{storeTime.date} · {storeTime.time}</p><h2>Hola, {user.name.split(' ')[0]}.</h2><p>Este es un resumen simple de tus compras, puntos y beneficios en Comercial Nazareth.</p><button onClick={()=>onNavigate('Productos')}>Ver productos <ArrowRight/></button></div>
      <article><span>Puntos disponibles</span><strong>240</strong><div><i/></div><p>Te faltan <b>60 puntos</b> para recibir S/ 5 de descuento.</p><button onClick={()=>onNavigate('Mi cuenta')}>Ver beneficios <ChevronRight/></button></article>
    </section>
    <section className="minimal-metrics"><article><span>Ahorraste este mes</span><strong>S/ 18.70</strong><small>En cuatro promociones</small></article><article><span>Compras este año</span><strong>24</strong><small>La última fue hoy</small></article><article><span>Total acumulado</span><strong>S/ 487.50</strong><small>Desde febrero de 2025</small></article></section>
    <section className="minimal-primary-grid">
      <article className="next-basket"><header><div><span>Próxima compra</span><h3>Tu canasta habitual</h3></div><small>6 productos</small></header><div className="basket-products">{products.slice(0,3).map(product=><div key={product.id}><img src={product.image} alt={product.name}/><div><strong>{product.name}</strong><span>{currency(product.price)}</span></div></div>)}</div><footer><div><span>Total estimado</span><strong>S/ 27.30</strong></div><button className={prepared?'done':''} onClick={()=>setPrepared(true)}>{prepared?<><Check/>Canasta preparada</>:<>Preparar canasta <ArrowRight/></>}</button></footer></article>
      <article className="weekly-offer"><img src="/products/bebidas.jpg" alt="Bebidas disponibles en oferta"/><div><span>Oferta de la semana</span><h3>Inca Kola 1.5 L</h3><p>15% menos hasta el 31 de agosto.</p><strong>S/ 5.95</strong><div><button className={saved?'saved':''} onClick={()=>setSaved(!saved)}><Heart/>{saved?'Guardada':'Guardar'}</button><button onClick={()=>onNavigate('Promociones')}>Ver ofertas</button></div></div></article>
    </section>
    <section className="minimal-products"><header><div><span>Según tus compras</span><h3>Productos que sueles llevar</h3></div><button onClick={()=>onNavigate('Productos')}>Ver catálogo <ArrowRight/></button></header><div>{products.slice(0,4).map(product=><article key={product.id}><img src={product.image} alt={product.name}/><div><span>{product.category}</span><strong>{product.name}</strong><b>{currency(product.price)}</b></div><button aria-label="Añadir a la lista"><PackageCheck/></button></article>)}</div></section>
    <section className="minimal-history"><header><div><span>Actividad reciente</span><h3>Últimas compras</h3></div><button>Ver todas <ChevronRight/></button></header>{purchases.map(purchase=><article key={purchase.date}><span className="history-icon"><ShoppingBag/></span><div><strong>{purchase.items}</strong><small>{purchase.date}</small></div><span className="payment-label">{purchase.pay}</span><b>{currency(purchase.total)}</b><button><ReceiptText/>Comprobante</button></article>)}<footer><Clock3/>Actualizado hoy a las {storeTime.time}</footer></section>
  </div>
}


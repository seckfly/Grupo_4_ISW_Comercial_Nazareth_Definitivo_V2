import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/States'
import { api } from '../../services/api'
import { currency } from '../../utils/format'
import { formatSaleCreatedAt } from '../../utils/sale'
export default function ClientHome({onNavigate}) {
  const {user}=useAuth()
  const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  useEffect(()=>{const controller=new AbortController();setData(null);setError('');api.customerSales(controller.signal).then(setData).catch(error=>{if(!controller.signal.aborted)setError(error.message)});return()=>controller.abort()},[retry])
  return <div className="page client-summary-minimal"><PageHeader title={'Hola, '+user.name} description="Tus compras registradas en Comercial Nazareth"/>
    <section className="minimal-welcome"><div><h2>Tu próxima visita</h2><p>Consulta el catálogo y las campañas registradas.</p><button className="primary" onClick={()=>onNavigate('Productos')}>Explorar productos</button></div></section>
    <Card><h3>Mis compras</h3>{error?<><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={()=>setRetry(value=>value+1)}>Reintentar</button></>:!data?<Skeleton/>:data.length?data.map(sale=><div className="history-row" key={sale.id}><div><strong>Venta #{sale.id}</strong><small>{formatSaleCreatedAt(sale.createdAt).date} · {sale.paymentMethod}</small><p>{sale.items.map(item=>item.name).join(', ')}</p></div><b>{currency(sale.total)}</b></div>):<p>Aún no hay compras vinculadas a tu cuenta.</p>}</Card>
  </div>
}


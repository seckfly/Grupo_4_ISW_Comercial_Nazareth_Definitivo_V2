import { useState } from 'react'
import { PackageSearch, ReceiptText, TrendingUp, WalletCards } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, StockPill } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/States'
import SalesTrend from '../../components/charts/SalesTrend'
import ProductBars from '../../components/charts/ProductBars'
import { currency, quantityLabel, countLabel } from '../../utils/format'
import { formatSaleCreatedAt } from '../../utils/sale'
import { useDashboard } from '../../hooks/useDashboard'
import { useInventory } from '../../context/InventoryContext'
const insufficient = 'Aún no hay datos suficientes'
export function Analytics({ report = false, onNavigate }) {
  const [period, setPeriod] = useState('week')
  const { data, loading, error, retry } = useDashboard(period)
  const inventory = useInventory()
  const alerts = inventory.data.products.filter(product => product.isActive && product.lowStock)
  if (loading) return <div className="page"><PageHeader title={report ? 'Reportes' : 'Resumen'} description="Consultando operaciones registradas"/><Skeleton/></div>
  if (error) return <div className="page"><PageHeader title={report ? 'Reportes' : 'Resumen'}/><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={retry}>Reintentar</button></div>
  return <div className={report ? 'page reports-page' : 'page admin-overview'}>
    <PageHeader kicker="Lectura del negocio" title={report ? 'Reportes' : 'Resumen'} description="Ventas y existencias registradas · Hora de Lima"/>
    {!report && <section className="command-hero"><div className="command-copy"><h2>El negocio, <em>en este momento.</em></h2>
      <p>{inventory.loading ? 'Consultando existencias…' : inventory.error ? 'No se pudieron consultar las existencias.' : alerts.length ? countLabel(alerts.length, 'producto requiere atención por stock.', 'productos requieren atención por stock.') : 'No hay productos en alerta de stock.'}</p>
      {alerts.length > 0 && !inventory.error && <div className="hero-actions"><button onClick={() => onNavigate?.('Inventario')}>Revisar inventario</button></div>}
    </div><div className="command-cash"><div className="cash-head"><span>Caja de hoy</span><WalletCards/></div><strong>{currency(data.today.total)}</strong>
      <div className="cash-detail"><div><b>{data.today.saleCount}</b><span>{data.today.saleCount === 1 ? 'operación' : 'operaciones'}</span></div><div><b>{currency(data.today.cashTotal)}</b><span>Efectivo cobrado</span></div><div><b>{currency(data.today.paymentTotals.yape)}</b><span>Yape</span></div><div><b>{currency(data.today.paymentTotals.plin)}</b><span>Plin</span></div></div></div></section>}
    {!report && <section className="pulse-strip">
      {[['Proyección de cierre', data.projection === null ? insufficient : currency(data.projection)],['Vs. ayer (día completo)',data.comparison === null ? insufficient : data.comparison + '%'],['Hora más fuerte del periodo',data.strongestHour === null ? insufficient : data.strongestHour + ':00–' + (Number(data.strongestHour)+1) + ':00'],['Avance de metas',insufficient]].map(([label,value]) => <article className="pulse-metric" key={label}><div><span>{label}</span></div><strong className="analytics-value">{value}</strong></article>)}
    </section>}
    <div className="report-range"><button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Últimos 7 días</button><button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Este mes</button></div>
    <div className="report-kpis"><article><TrendingUp/><span>Ventas netas del periodo</span><strong>{currency(data.summary.total)}</strong><small>{countLabel(data.summary.saleCount,'operación','operaciones')}</small></article><article><ReceiptText/><span>Efectivo cobrado</span><strong>{currency(data.summary.cashTotal)}</strong></article><article><WalletCards/><span>Yape + Plin</span><strong>{currency(data.summary.digitalTotal)}</strong></article></div>
    <div className="overview-grid"><Card className="premium-chart"><div className="card-head"><h3>Ritmo por día</h3></div><SalesTrend data={data.trend}/>{!data.summary.saleCount && <p>No hay ventas registradas en este periodo.</p>}</Card>
    <Card><div className="card-head"><h3>Demanda por producto</h3></div>{data.demand.length ? <ProductBars data={data.demand.map(item => ({ ...item, name: item.name + ' · ' + item.unit }))}/> : <p>No hay detalle de ventas en este periodo.</p>}</Card></div>
    {!report && <div className="intel-grid"><Card className="stock-board"><div className="card-head"><h3>Riesgo de quiebre</h3><PackageSearch/></div>
      {inventory.loading ? <p>Consultando existencias…</p> : inventory.error ? <p className="form-error" role="alert">{inventory.error}</p> : alerts.length ? alerts.map(product => <div className="history-row" key={product.id}><div><strong>{product.name}</strong><small>Mínimo: {quantityLabel(product.minimum,product.unit)}</small></div><StockPill stock={product.stock} minimum={product.minimum} unit={product.unit}/></div>) : <p>No hay productos en alerta de stock.</p>}
    </Card><Card className="demand-board"><h3>Lo que mueve la tienda</h3>{data.demand.length ? data.demand.map(item => <div className="demand-row" key={item.productId + item.unit}><div><strong>{item.name}</strong><small>{quantityLabel(item.sold,item.unit)}</small></div><b>{currency(item.revenue)}</b></div>) : <p>No hay ventas registradas en este periodo.</p>}</Card></div>}
    {!report && <Card className="activity-ledger"><div className="card-head"><h3>Actividad reciente</h3></div>{data.activity.length ? data.activity.map(item => <div className="history-row" key={item.kind + item.id}><div><strong>{item.kind === 'sale' ? 'Venta #' + item.id : (item.type === 'adjustment' ? 'Ajuste: ' : 'Entrada: ') + item.name}</strong><small>{formatSaleCreatedAt(item.createdAt).date} · {formatSaleCreatedAt(item.createdAt).time}</small></div><strong>{item.kind === 'sale' ? currency(item.total) : quantityLabel(item.change,item.unit)}</strong></div>) : <p>Aún no hay operaciones registradas.</p>}</Card>}
    {report && <Card className="margin-story"><h3>Margen y recomendaciones</h3><p>{insufficient}. No se dispone de costos históricos por venta ni de metas configuradas.</p></Card>}
  </div>
}
export default function Overview(props) { return <Analytics {...props}/> }


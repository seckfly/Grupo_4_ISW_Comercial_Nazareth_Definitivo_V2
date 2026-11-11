import { useEffect, useState } from 'react'
import { Plus, Search, ReceiptText, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { InventoryDrawer } from '../Inventory/InventoryDrawers'
import { api } from '../../services/api'
import { currency, countLabel, quantityLabel } from '../../utils/format'
import { formatSaleCreatedAt } from '../../utils/sale'
import { useLiveDateTime } from '../../hooks/useLiveDateTime'

const paymentNames = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin' }

export default function Sales({ openSale, revision = 0 }) {
  const storeTime = useLiveDateTime()
  const [query, setQuery] = useState('')
  const [payment, setPayment] = useState('Todos')
  const [period, setPeriod] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.sales(period, controller.signal).then(setData).catch((error) => {
      if (!controller.signal.aborted) setError(error.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [period, revision, retry])

  const term = query.trim().toLocaleLowerCase('es')
  const rows = (data?.sales || []).filter((sale) =>
    (payment === 'Todos' || sale.paymentMethod === payment) &&
    (!term || [String(sale.id), sale.customerName || '', ...sale.items.map((item) => item.name)].join(' ').toLocaleLowerCase('es').includes(term)),
  )
  const summary = data?.summary
  const current = !loading && !error && summary
  const percentage = (amount) => summary?.total ? ((amount / summary.total) * 100).toFixed(1) + '% del total' : '0% del total'

  return <div className="page sales-page">
    <PageHeader kicker="Caja y movimientos" title="Ventas" description="Cada operación, conciliada y fácil de encontrar."
      action={<button className="primary" onClick={openSale}><Plus/>Registrar venta</button>}/>
    <div className="sales-summary">
      <div><span>{period === 'today' ? 'HOY' : period === 'week' ? 'ÚLTIMOS 7 DÍAS' : 'ESTE MES'}</span><strong>{current ? currency(summary.total) : '—'}</strong><small>{current ? countLabel(summary.saleCount, 'operación', 'operaciones') : 'Consultando…'}</small></div>
      <div><span>EFECTIVO</span><strong>{current ? currency(summary.cashTotal) : '—'}</strong><small>{current ? percentage(summary.cashTotal) : '—'}</small></div>
      <div><span>YAPE + PLIN</span><strong>{current ? currency(summary.digitalTotal) : '—'}</strong><small>{current ? percentage(summary.digitalTotal) : '—'}</small></div>
    </div>
    <div className="toolbar premium-toolbar">
      <label className="search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto o número de venta" aria-label="Buscar venta"/></label>
      <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Periodo de ventas"><option value="today">Hoy, {storeTime.date.split(', ')[1]}</option><option value="week">Últimos 7 días</option><option value="month">Este mes</option></select>
      <select value={payment} onChange={(event) => setPayment(event.target.value)} aria-label="Método de pago"><option>Todos</option>{Object.entries(paymentNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select>
    </div>
    <Card className="data-card">
      {loading ? <Skeleton rows={5}/> : error ? <div className="sales-feedback"><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div> :
        rows.length ? <div className="table-wrap"><table><thead><tr><th>Venta</th><th>Fecha y hora</th><th>Detalle</th><th>Pago</th><th>Total</th><th/></tr></thead><tbody>
          {rows.map((sale) => {
            const { date, time } = formatSaleCreatedAt(sale.createdAt)
            return <tr key={sale.id}>
              <td><span className="sale-number">#{sale.id}</span></td>
              <td><time className="sale-timestamp" dateTime={sale.createdAt}><span>{date}</span><small>{time}</small></time></td>
              <td><strong>{sale.items.map((item) => item.name + ' × ' + item.quantity).join(', ')}</strong>{sale.customerName && <small className="inventory-detail">{sale.customerName}</small>}</td>
              <td><span className="payment">{paymentNames[sale.paymentMethod]}</span></td><td><strong>{currency(sale.total)}</strong></td>
              <td><button className="icon-btn" onClick={() => setSelected(sale)} aria-label={'Ver venta ' + sale.id}><ChevronRight/></button></td>
            </tr>
          })}
        </tbody></table></div> : <EmptyState icon={<ReceiptText/>} title="No encontramos ventas" copy="Prueba con otro producto o cambia los filtros para ampliar la búsqueda."/>}
    </Card>
    {selected && <InventoryDrawer title={'Venta #' + selected.id} kicker={formatSaleCreatedAt(selected.createdAt).date} close={() => setSelected(null)}>
      <div className="inventory-history sale-details">
        <p>{selected.customerName || 'Venta sin cliente'} · {paymentNames[selected.paymentMethod]}</p>
        {selected.items.map((item, index) => <article className="inventory-movement" key={index}><strong>{item.name}</strong><div><span>{quantityLabel(item.quantity, item.unit)} × {currency(item.unitPrice)}</span><b>{currency(item.subtotal)}</b></div></article>)}
        <div className="price-summary"><div><span>Subtotal</span><strong>{currency(selected.subtotal)}</strong></div><div><span>Descuento</span><strong>{currency(selected.discount)}</strong></div><div className="grand-total"><span>Total</span><strong>{currency(selected.total)}</strong></div></div>
        {selected.cashReceived !== null && <p>Recibido: {currency(selected.cashReceived)} · Vuelto: {currency(selected.change)}</p>}
        {selected.paymentReference && <p>Referencia: {selected.paymentReference}</p>}
      </div>
    </InventoryDrawer>}
  </div>
}


import { useCallback, useEffect, useState } from 'react'
import { Plus, List, Grid2X2, Search, PackagePlus, Pencil, SlidersHorizontal, History } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, StockPill } from '../../components/ui/Card'
import { Skeleton, EmptyState } from '../../components/ui/States'
import { useInventory } from '../../context/InventoryContext'
import { currency, margin, quantityLabel } from '../../utils/format'
import { ProductDrawer, AdjustmentDrawer, HistoryDrawer } from './InventoryDrawers'

function ProductActions({ product, open, buy }) {
  return <div className="inventory-actions">
    <button className="icon-btn" type="button" onClick={() => open('edit', product)} aria-label={'Editar ' + product.name} title="Editar producto"><Pencil/></button>
    <button className="icon-btn" type="button" onClick={() => open('adjust', product)} aria-label={'Ajustar stock de ' + product.name} title="Ajustar stock"><SlidersHorizontal/></button>
    <button className="icon-btn" type="button" onClick={() => open('history', product)} aria-label={'Ver historial de ' + product.name} title="Historial"><History/></button>
    {product.isActive&&product.stock<product.minimum&&<button className="icon-btn" type="button" title="Preparar orden de compra" aria-label={'Preparar compra de '+product.name} onClick={()=>buy(product)}><PackagePlus/></button>}
  </div>
}

export default function Inventory({onNavigate}) {
  const { data, setData, loading, error, setRevision } = useInventory()
  useEffect(() => { setRevision(value => value + 1) }, [setRevision])
  const [notice, setNotice] = useState('')
  const [category, setCategory] = useState('all')
  const [view, setView] = useState('list')
  const [query, setQuery] = useState('')
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [panel, setPanel] = useState(null)
  const open = useCallback((type, product) => setPanel({ type, product }), [])
  function saved(product, message) {
    setData((current) => ({
      ...current,
      products: [...current.products.filter((item) => item.id !== product.id), product].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }))
    setPanel(null)
    setNotice(message)
  }

  const products = data.products
  const active = products.filter((product) => product.isActive)
  const stockAlerts = active.filter((product) => product.lowStock)
  const inventoryValue = active.reduce((sum, product) => sum + product.cost * product.stock, 0)
  const averageMargin = active.length ? Math.round(active.reduce((sum, product) => sum + margin(product.cost, product.price), 0) / active.length) : 0
  const term = query.trim().toLocaleLowerCase('es')
  const shown = products.filter((product) =>
    (category === 'all' || product.categoryId === category) &&
    (!alertsOnly || product.lowStock) &&
    (!term || product.name.toLocaleLowerCase('es').includes(term)),
  )

  return <div className="page inventory-page">
    <PageHeader kicker="Productos y existencias" title="Inventario" description="Control preciso de stock, costo y margen por producto."
      action={<button className="primary" disabled={loading || Boolean(error)} onClick={() => open('create')}><Plus/>Agregar producto</button>}/>
    <div className="inventory-strip">
      <div><PackagePlus/><span>Valor del inventario</span><strong>{loading || error ? '—' : currency(inventoryValue)}</strong></div>
      <div><span>Productos activos</span><strong>{loading || error ? '—' : active.length}</strong></div>
      <div><span>Margen promedio</span><strong>{loading || error ? '—' : averageMargin + '%'}</strong></div>
      <div className="danger-stat"><span>Stock en alerta</span><strong>{loading || error ? '—' : stockAlerts.length}</strong></div>
    </div>
    {notice && <p className="form-success" role="status">{notice}</p>}
    <div className="toolbar between premium-toolbar inventory-filters">
      <div className="chips">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Todos</button>
        {data.categories.map((item) => <button className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)} key={item.id}>{item.name}</button>)}
      </div>
      <label className="search compact"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" aria-label="Buscar producto"/></label>
      <button className={alertsOnly ? 'primary' : 'secondary'} aria-pressed={alertsOnly} onClick={() => setAlertsOnly((value) => !value)}>Solo alertas</button>
      <div className="view-toggle">
        <button onClick={() => setView('list')} className={view === 'list' ? 'active' : ''} aria-label="Vista de lista" aria-pressed={view === 'list'}><List/></button>
        <button onClick={() => setView('grid')} className={view === 'grid' ? 'active' : ''} aria-label="Vista de tarjetas" aria-pressed={view === 'grid'}><Grid2X2/></button>
      </div>
    </div>
    {error ? <Card><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></Card> :
      loading ? <Card><Skeleton rows={5}/></Card> :
      !shown.length ? <Card><EmptyState icon={<PackagePlus/>} title="Sin productos" copy={products.length ? 'No hay productos que coincidan con los filtros.' : 'Registra un producto para comenzar el inventario.'}/></Card> :
      view === 'list' ? <Card className="data-card"><div className="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Stock físico / mínimo</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Acciones</th></tr></thead>
        <tbody>{shown.map((product) => <tr key={product.id}>
          <td><div className="product-cell"><span>{product.name[0]}</span><div><strong>{product.name}</strong>{!product.isActive && <small className="inventory-detail">Inactivo</small>}</div></div></td>
          <td>#{String(product.id).padStart(4, '0')}</td><td>{product.category}</td>
          <td><StockPill unit={product.unit} stock={product.stock} minimum={product.minimum} isActive={product.isActive}/><small className="inventory-detail">Físico · Apartado: {quantityLabel(product.held,product.unit)} · Disponible: {quantityLabel(product.available,product.unit)}</small><small className="inventory-detail">Mínimo: {quantityLabel(product.minimum, product.unit)}{product.lowStock ? ' · Requiere atención' : ''}</small></td>
          <td>{currency(product.cost)}</td><td><strong>{currency(product.price)}</strong></td><td><span className="margin">{margin(product.cost, product.price)}%</span></td>
          <td><ProductActions product={product} open={open} buy={product=>onNavigate?.('Compras',product)}/></td>
        </tr>)}</tbody>
      </table></div></Card> : <div className="product-grid premium-products">{shown.map((product) => <Card key={product.id}>
        <div className="product-card-top"><span className="product-letter">{product.name[0]}</span><StockPill unit={product.unit} stock={product.stock} minimum={product.minimum} isActive={product.isActive}/></div>
        <small>{product.category} · #{String(product.id).padStart(4, '0')}{!product.isActive ? ' · Inactivo' : ''}</small>
        <h3>{product.name}</h3><small className="inventory-detail">Físico: {quantityLabel(product.stock,product.unit)} · Apartado: {quantityLabel(product.held,product.unit)} · Disponible: {quantityLabel(product.available,product.unit)}</small><small className="inventory-detail">Mínimo: {quantityLabel(product.minimum, product.unit)}{product.lowStock ? ' · Requiere atención' : ''}</small>
        <div className="price-row"><strong>{currency(product.price)}</strong><span>{margin(product.cost, product.price)}% margen</span></div>
        <ProductActions product={product} open={open} buy={product=>onNavigate?.('Compras',product)}/>
      </Card>)}</div>}
    {(panel?.type === 'create' || panel?.type === 'edit') && <ProductDrawer product={panel.product} categories={data.categories} close={() => setPanel(null)} saved={saved}/>}
    {panel?.type === 'adjust' && <AdjustmentDrawer product={panel.product} close={() => setPanel(null)} saved={saved}/>}
    {panel?.type === 'history' && <HistoryDrawer product={panel.product} close={() => setPanel(null)}/>}
  </div>
}


import { useCallback, useEffect, useState } from 'react'
import { Archive, ArchiveRestore, Plus, List, Grid2X2, Search, PackagePlus, Pencil, SlidersHorizontal, History, Trash2 } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmationDrawer from '../../components/ui/ConfirmationDrawer'
import { api } from '../../services/api'
import { Card } from '../../components/ui/Card'
import { Skeleton, EmptyState } from '../../components/ui/States'
import { useInventory } from '../../context/InventoryContext'
import { currency, margin, quantityLabel } from '../../utils/format'
import { ProductDrawer, AdjustmentDrawer, HistoryDrawer } from './InventoryDrawers'

function InventoryStock({ product }) {
  return <dl className="inventory-stock">
    <div className="inventory-stock-available">
      <dt>Disponible</dt><dd>{quantityLabel(product.available, product.unit)}</dd>
    </div>
    <div><dt>Físico</dt><dd>{quantityLabel(product.stock, product.unit)}</dd></div>
    <div><dt>Apartado</dt><dd>{quantityLabel(product.held, product.unit)}</dd></div>
    <div className="inventory-stock-minimum">
      <dt>Stock mínimo para alerta</dt>
      <dd>{quantityLabel(product.minimum, product.unit)}{product.lowStock && <span className="inventory-stock-alert">Requiere atención</span>}</dd>
    </div>
  </dl>
}

function ProductActions({ product, open }) {
  return <div className="inventory-actions">
    {!product.archivedAt && <>
      <button className="icon-btn" type="button" onClick={() => open('edit', product)} aria-label={'Editar ' + product.name} title="Editar producto"><Pencil/></button>
      <button className="icon-btn" type="button" onClick={() => open('adjust', product)} aria-label={'Ajustar stock de ' + product.name} title="Ajustar stock"><SlidersHorizontal/></button>
    </>}
    <button className="icon-btn" type="button" onClick={() => open('history', product)} aria-label={'Ver historial de ' + product.name} title="Historial"><History/></button>
    {product.archivedAt
      ? <button className="secondary" type="button" onClick={() => open('restore', product)} aria-label={'Restaurar ' + product.name}><ArchiveRestore/>Restaurar</button>
      : <button className="secondary" type="button" onClick={() => open('archive', product)} aria-label={'Archivar ' + product.name}><Archive/>Archivar</button>}
    <button className="icon-btn" type="button" onClick={() => open('delete', product)}
      aria-label={'Eliminar definitivamente ' + product.name} title="Eliminar definitivamente"><Trash2/></button>
  </div>
}

export default function Inventory() {
  const { data, setData, loading, error, setRevision } = useInventory()
  useEffect(() => { setRevision(value => value + 1) }, [setRevision])
  const [notice, setNotice] = useState('')
  const [archived, setArchived] = useState(false)
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

  function selectArchive(next) {
    setArchived(next)
    setAlertsOnly(false)
    setCategory('all')
    setQuery('')
  }
  async function confirmProduct(confirmation) {
    const { type, product } = panel
    if (type === 'delete') {
      try { await api.deleteProduct(product.id, confirmation, product.stock) }
      catch (failure) {
        if (failure.status === 409) setRevision(value => value + 1)
        throw failure
      }
      setData(current => ({ ...current, products: current.products.filter(item => item.id !== product.id) }))
      setPanel(null)
      setNotice('Producto dado de baja definitivamente.')
    } else {
      const moved = await api.archiveProduct(product.id, type === 'archive')
      saved(moved, type === 'archive' ? 'Producto archivado.' : 'Producto restaurado y activo.')
    }
    setRevision(value => value + 1)
  }

  const products = data.products
  const active = products.filter((product) => product.isActive)
  const stockAlerts = active.filter((product) => product.lowStock)
  const inventoryValue = products.filter(product => product.isActive || product.archivedAt).reduce((sum, product) => sum + product.cost * product.stock, 0)
  const averageMargin = active.length ? Math.round(active.reduce((sum, product) => sum + margin(product.cost, product.price), 0) / active.length) : 0
  const term = query.trim().toLocaleLowerCase('es')
  const shown = products.filter((product) =>
    Boolean(product.archivedAt) === archived &&
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
    <div className="seg inventory-record-tabs" role="group" aria-label="Mostrar productos">
      <button type="button" className={archived ? '' : 'active'} aria-pressed={!archived} onClick={() => selectArchive(false)}>Productos</button>
      <button type="button" className={archived ? 'active' : ''} aria-pressed={archived} onClick={() => selectArchive(true)}>Archivados</button>
    </div>
    <div className="toolbar between premium-toolbar inventory-filters">
      <div className="chips">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Todos</button>
        {data.categories.map((item) => <button className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)} key={item.id}>{item.name}</button>)}
      </div>
      <label className="search compact"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" aria-label="Buscar producto"/></label>
      {!archived && <button className={alertsOnly ? 'primary' : 'secondary'} aria-pressed={alertsOnly} onClick={() => setAlertsOnly((value) => !value)}>Solo alertas</button>}
      <div className="view-toggle">
        <button onClick={() => setView('list')} className={view === 'list' ? 'active' : ''} aria-label="Vista de lista" aria-pressed={view === 'list'}><List/></button>
        <button onClick={() => setView('grid')} className={view === 'grid' ? 'active' : ''} aria-label="Vista de tarjetas" aria-pressed={view === 'grid'}><Grid2X2/></button>
      </div>
    </div>
    {error ? <Card><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></Card> :
      loading ? <Card><Skeleton rows={5}/></Card> :
      !shown.length ? <Card><EmptyState icon={<PackagePlus/>} title={archived ? 'Sin productos archivados' : 'Sin productos'} copy={archived ? 'Los productos archivados que coincidan con la búsqueda aparecerán aquí.' : products.length ? 'No hay productos que coincidan con los filtros.' : 'Registra un producto para comenzar el inventario.'}/></Card> :
      view === 'list' ? <Card className="data-card"><div className="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Código</th><th>Categoría</th><th>Existencias</th><th>Costo promedio por unidad</th><th>Precio</th><th>Margen</th><th>Acciones</th></tr></thead>
        <tbody>{shown.map((product) => <tr key={product.id}>
          <td><div className="product-cell"><span>{product.name[0]}</span><div><strong>{product.name}</strong>{!product.isActive && <small className="inventory-detail">{product.archivedAt ? 'Archivado' : 'Inactivo'}</small>}</div></div></td>
          <td>#{String(product.id).padStart(4, '0')}</td><td>{product.category}</td>
          <td><InventoryStock product={product}/></td>
          <td>{currency(product.cost)}</td><td><strong>{currency(product.price)}</strong></td><td><span className="margin">{margin(product.cost, product.price)}%</span></td>
          <td><ProductActions product={product} open={open}/></td>
        </tr>)}</tbody>
      </table></div></Card> : <div className="product-grid premium-products">{shown.map((product) => <Card key={product.id}>
        <div className="product-card-top"><span className="product-letter">{product.name[0]}</span></div>
        <small>{product.category} · #{String(product.id).padStart(4, '0')}{product.archivedAt ? ' · Archivado' : !product.isActive ? ' · Inactivo' : ''}</small>
        <h3>{product.name}</h3><InventoryStock product={product}/>
        <small>Costo promedio por unidad · {currency(product.cost)}</small>
        <div className="price-row"><strong>{currency(product.price)}</strong><span>{margin(product.cost, product.price)}% margen</span></div>
        <ProductActions product={product} open={open}/>
      </Card>)}</div>}
    {['archive', 'restore', 'delete'].includes(panel?.type) && <ConfirmationDrawer
      title={{ archive: 'Archivar producto', restore: 'Restaurar producto', delete: 'Eliminar producto definitivamente' }[panel.type]}
      close={() => setPanel(null)} onConfirm={confirmProduct} requireWord={panel.type === 'delete'}
      confirmLabel={{ archive: 'Archivar', restore: 'Restaurar', delete: 'Eliminar producto' }[panel.type]}>
      <p><strong>{panel.product.name}</strong></p>
      {panel.type === 'archive' && <p>Stock físico registrado: {quantityLabel(panel.product.stock, panel.product.unit)}. Podrás encontrarlo en Archivados y consultar su historial.</p>}
      {panel.type === 'restore' && <p>Volverá a la lista de productos como activo.</p>}
      {panel.type === 'delete' && <>
        <p>Se retirará del inventario el stock físico de este producto: <strong>{quantityLabel(panel.product.stock, panel.product.unit)}</strong>.</p>
        <p>La baja es permanente. Sus operaciones anteriores seguirán en el historial.</p>
      </>}
    </ConfirmationDrawer>}
    {(panel?.type === 'create' || panel?.type === 'edit') && <ProductDrawer product={panel.product} categories={data.categories} close={() => setPanel(null)} saved={saved}/>}
    {panel?.type === 'adjust' && <AdjustmentDrawer product={panel.product} close={() => setPanel(null)} saved={saved}/>}
    {panel?.type === 'history' && <HistoryDrawer product={panel.product} close={() => setPanel(null)}/>}
  </div>
}


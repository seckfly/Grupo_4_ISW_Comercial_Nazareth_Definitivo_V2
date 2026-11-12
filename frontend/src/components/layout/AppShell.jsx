import { quantityLabel } from '../../utils/format'
import { useEffect,useMemo,useRef,useState } from 'react'
import { LayoutDashboard,ShoppingCart,Package,BadgePercent,Users,ChartNoAxesCombined,Settings,LogOut,Menu,Ellipsis,X,Plus,Search,Bell,ArrowRight,Clock3,TriangleAlert,CheckCircle2,Store } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useInventory } from '../../context/InventoryContext'
import { useLiveDateTime } from '../../hooks/useLiveDateTime'
import { usePhoneLayout } from '../../hooks/usePhoneLayout'
import { searchCommands,visibleNavigation } from '../../utils/auth'
const adminMobileItems = ['Resumen', 'Ventas', 'Inventario', 'Reservas']
const icons={Compras:Package,Reservas:Package,Resumen:LayoutDashboard,Productos:Store,Ventas:ShoppingCart,Inventario:Package,Promociones:BadgePercent,Clientes:Users,Reportes:ChartNoAxesCombined,Configuración:Settings,'Mi cuenta':Users}
export default function AppShell({page,setPage,onSale,children}){
  const {alertCount, data: inventory, loading: stockLoading, error: stockError}=useInventory();
  useEffect(()=>{setNotices(false)},[page])
  const {user,logout}=useAuth();const storeTime=useLiveDateTime();const [open,setOpen]=useState(false);const [palette,setPalette]=useState(false);const [notices,setNotices]=useState(false);const [query,setQuery]=useState('');const searchRef=useRef(null);const items=visibleNavigation(user.role);const client=user.role==='client';const commands=useMemo(()=>searchCommands(query,user.role),[query,user.role])
  const compactShell = usePhoneLayout(900)
  const menu = useRef(null)
  const main = useRef(null)
  const mobileMenuTrigger = useRef(null)
  const mobileMenuClose = useRef(null)
  const mobileItems = client ? items : adminMobileItems
  const menuItems = compactShell && !client ? items.filter(name => !mobileItems.includes(name)) : items
  function showMobileMenu(event) {
    mobileMenuTrigger.current = event.currentTarget
    setOpen(true)
  }
  function closeMobileMenu() {
    setOpen(false)
    const trigger = mobileMenuTrigger.current
    mobileMenuTrigger.current = null
    trigger?.focus()
  }
  useEffect(() => {
    if (!compactShell || !open) return
    mobileMenuClose.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [compactShell, open])
  function trapMenuFocus(event) {
    if (!compactShell || !open || event.key !== 'Tab') return
    const buttons = [...menu.current.querySelectorAll('button:not(:disabled)')]
    const boundary = event.shiftKey ? buttons[0] : buttons.at(-1)
    if (document.activeElement === boundary) {
      event.preventDefault()
      const next = event.shiftKey ? buttons.at(-1) : buttons[0]
      next?.focus()
    }
  }
  useEffect(()=>{if(palette)setTimeout(()=>searchRef.current?.focus(),30)},[palette])
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  async function endSession() {
    setSigningOut(true)
    setLogoutError('')
    try { await logout() } catch (error) { setLogoutError(error.message) } finally { setSigningOut(false) }
  }
  function go(destination) {
    if (compactShell) {
      window.scrollTo(0, 0)
      if (open) main.current?.focus({ preventScroll: true })
      mobileMenuTrigger.current = null
    }
    setNotices(false);setPage(destination);setPalette(false);setQuery('');setOpen(false)
  }
  const notificationPanel = notices&&<section className="notice-panel"><header><div><p className="eyebrow">Centro de actividad</p><h3>Notificaciones</h3></div><button onClick={()=>setNotices(false)} aria-label="Cerrar notificaciones"><X/></button></header>{client?<p>No hay notificaciones disponibles.</p>:stockLoading?<p>Consultando existencias…</p>:stockError?<p role="alert">{stockError}</p>:inventory.products.filter(product=>product.isActive&&product.lowStock).length?inventory.products.filter(product=>product.isActive&&product.lowStock).map(product=><article key={product.id}><span className="notice-icon stock-alert"><TriangleAlert/></span><div><strong>{product.name}</strong><small>Stock: {quantityLabel(product.stock,product.unit)} · Mínimo: {quantityLabel(product.minimum,product.unit)}</small></div></article>):<p>No hay productos en alerta de stock.</p>}<button className="notice-footer">Marcar todo como leído</button></section>
  return <div className={`app premium-app ${client?'client-shell':'admin-shell'}`}><a className="skip-link" href="#main">Saltar al contenido</a>{open && <button type="button" className="mobile-menu-backdrop" aria-label="Cerrar menú" onClick={closeMobileMenu}/>}<aside id="app-menu" ref={menu} className={open?'open':''} onKeyDown={trapMenuFocus}><div className="brand"><div>N</div><span>Comercial<br/><b>Nazareth</b></span><button type="button" ref={mobileMenuClose} aria-label="Cerrar navegación" onClick={closeMobileMenu}><X/></button></div><div className="rail-label">{client?'Mi Nazareth':'Operación'}</div><nav aria-label={compactShell && !client ? 'Más secciones' : 'Secciones'}>{menuItems.map(n=>{const Icon=icons[n];return <button className={n===page?'active':''} key={n} onClick={()=>go(n)}><Icon strokeWidth={1.7}/>{n}{!client&&n==='Inventario'&&<i>{alertCount ?? '—'}</i>}</button>})}</nav><div className="owner"><div className="avatar">{user.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><strong>{user.name}</strong><span>{client?'Cliente frecuente':'Administrador'}</span></div><button type="button" onClick={endSession} disabled={signingOut} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut/></button></div>{logoutError&&<p className="form-error" role="alert">{logoutError}</p>}</aside><main id="main" ref={main} tabIndex={-1}><div className="mobile-head">
      {client && <button type="button" onClick={showMobileMenu} aria-label="Abrir menú" aria-controls="app-menu" aria-expanded={open}><Menu/></button>}
      <b>Comercial Nazareth</b>
      {!client && <div className="mobile-admin-actions">
        {compactShell && <button type="button" className={`notice-button ${notices ? 'active' : ''}`} onClick={() => setNotices(value => !value)}
          aria-label="Notificaciones" aria-expanded={notices}><Bell aria-hidden="true"/>{alertCount > 0 && <i>{alertCount}</i>}</button>}
        <button type="button" className="mini-sale" onClick={onSale}><Plus/>Nueva venta</button>
      </div>}
      {compactShell && notificationPanel}
    </div><header className="top premium-top"><div><p className="eyebrow">{client?'Portal de cliente':'Comercial Nazareth'}</p><span className="top-context">{client?'Mi Nazareth':'Panel de administración'}</span></div><div className="top-actions">{!client&&<button className="command-search" onClick={()=>setPalette(true)}><Search/>Buscar en el panel</button>}{!compactShell && <button className={`notice-button ${notices?'active':''}`} onClick={()=>setNotices(!notices)} aria-label="Notificaciones" aria-expanded={notices}><Bell/>{!client&&alertCount>0&&<i>{alertCount}</i>}</button>}<div className="date-block" title={storeTime.date + ' · ' + storeTime.time}><span>{storeTime.weekday} · {storeTime.time}</span><strong>{storeTime.shortDate}</strong></div><div className="avatar">{user.name.slice(0,1)}</div>{!client&&page!=='Ventas'&&<button className="primary magnetic" onClick={onSale}><Plus/><span>Nueva venta</span><i><ArrowRight/></i></button>}</div>{!compactShell && notificationPanel}</header>{children}</main><nav className="bottom-nav" aria-label="Navegación móvil">
      {mobileItems.map(name => {
        const Icon = icons[name]
        const label = client && name === 'Resumen' ? 'Inicio' : name
        return <button type="button" className={name === page ? 'active' : ''} aria-current={name === page ? 'page' : undefined}
          aria-label={label} onClick={() => go(name)} key={name}><Icon aria-hidden="true"/><span>{client && name === 'Promociones' ? 'Promos' : label}</span></button>
      })}
      {!client && <button type="button" className={!mobileItems.includes(page) ? 'active' : ''} onClick={showMobileMenu}
        aria-controls="app-menu" aria-expanded={open}><Ellipsis aria-hidden="true"/><span>Más</span></button>}
    </nav>{palette&&<div className="command-overlay" onMouseDown={e=>e.target===e.currentTarget&&setPalette(false)}><section className="command-palette"><header><Search/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder={client?'Busca promociones o tu cuenta':'Busca ventas, inventario, clientes o reportes'}/><button type="button" className="icon-btn" aria-label="Cerrar búsqueda" onClick={()=>setPalette(false)}><X/></button></header><div className="command-results"><span className="command-label">Navegar</span>{commands.map((c,i)=>{const Icon=icons[c.page];return <button key={c.page} onClick={()=>go(c.page)}><span><Icon/></span><div><strong>{c.label}</strong><small>{c.hint}</small></div></button>})}{!commands.length&&<div className="command-empty">No hay resultados para “{query}”.</div>}</div>{!client&&<footer><span>Acción rápida</span><button onClick={()=>{setPalette(false);onSale()}}><Plus/>Registrar nueva venta</button></footer>}</section></div>}</div>
}

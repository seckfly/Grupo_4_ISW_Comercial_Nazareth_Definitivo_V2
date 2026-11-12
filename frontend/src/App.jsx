import { startTransition, useLayoutEffect, useRef, useState } from 'react'
import { AuthProvider,useAuth } from './context/AuthContext'
import { InventoryProvider, useInventory } from './context/InventoryContext'
import AppShell from './components/layout/AppShell'
import DeferredModule, { deferredModule } from './components/ui/DeferredModule'
const Login = deferredModule(() => import('./pages/Login'))
const SaleDrawer = deferredModule(() => import('./components/ui/SaleDrawer'))
const Overview = deferredModule(() => import('./pages/Overview'))
const Sales = deferredModule(() => import('./pages/Sales'))
const Inventory = deferredModule(() => import('./pages/Inventory'))
const Promotions = deferredModule(() => import('./pages/Promotions'))
const Customers = deferredModule(() => import('./pages/Customers'))
const Reports = deferredModule(() => import('./pages/Reports'))
const Settings = deferredModule(() => import('./pages/Settings'))
const Account = deferredModule(() => import('./pages/Account'))
const ClientHome = deferredModule(() => import('./pages/ClientHome'))
const Products = deferredModule(() => import('./pages/Products'))
const Purchases = deferredModule(() => import('./pages/Purchases'))
const Reservations = deferredModule(() => import('./pages/Reservations'))
const screens={Reservas:Reservations,Compras:Purchases,Resumen:Overview,Productos:Products,Ventas:Sales,Inventario:Inventory,Promociones:Promotions,Clientes:Customers,Reportes:Reports,Configuración:Settings,'Mi cuenta':Account}
function SaleLoadingFrame({ close, children }) {
  const dialog = useRef(null)
  useLayoutEffect(() => {
    const focus = document.activeElement, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => { document.body.style.overflow = overflow; focus?.focus() }
  }, [])
  function keyDown(event) {
    if (event.key === 'Escape') { event.stopPropagation(); close() }
    if (event.key !== 'Tab') return
    const controls = [...dialog.current.querySelectorAll('button')]
    const first = controls[0], last = controls.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus() }
  }
  return <div className="drawer-backdrop"><section className="form-drawer inventory-drawer" role="dialog" aria-modal="true" aria-label="Nueva venta" tabIndex={-1} ref={dialog} onKeyDown={keyDown}>
    <header><h2>Nueva venta</h2><button type="button" className="secondary" onClick={close}>Cerrar</button></header>
    <div className="inventory-history">{children}</div>
  </section></div>
}
function Dashboard() {
  const {user}=useAuth(), {setRevision}=useInventory()
  const [page,setPage]=useState('Resumen'), [sale,setSale]=useState(false), [salesRevision,setSalesRevision]=useState(0)
  const Screen=page==='Resumen'&&user.role==='client'?ClientHome:(screens[page]||Overview)
  function navigate(destination) { startTransition(() => setPage(destination)) }
  function registerSale(){setRevision(value=>value+1);setSalesRevision(value=>value+1);navigate('Ventas')}
  function openSale(reservation) {
    // Sales-page buttons pass a click event; only a real reservation carries an items array.
    setSale(reservation && Array.isArray(reservation.items) ? reservation : true)
  }
  const closeSale=()=>setSale(false)
  return <AppShell page={page} setPage={navigate} onSale={()=>setSale(true)}>
    <DeferredModule definition={Screen} label={page} componentProps={{openSale,onNavigate:navigate,revision:salesRevision}}/>
    {sale&&user.role==='admin'&&<DeferredModule definition={SaleDrawer} label="Nueva venta"
      fallback={<SaleLoadingFrame close={closeSale}><p role="status">Cargando Nueva venta…</p></SaleLoadingFrame>}
      errorFrame={content=><SaleLoadingFrame close={closeSale}>{content}</SaleLoadingFrame>}
      componentProps={{reservation:sale===true?null:sale,onCreated:registerSale,close:closeSale}}/>}
  </AppShell>
}
function Gate(){const {user}=useAuth();return user?<Dashboard key={`${user.id}:${user.role}`}/>:<DeferredModule definition={Login} label="Inicio de sesión"/>}
export default function App(){return <AuthProvider><InventoryProvider><Gate/></InventoryProvider></AuthProvider>}

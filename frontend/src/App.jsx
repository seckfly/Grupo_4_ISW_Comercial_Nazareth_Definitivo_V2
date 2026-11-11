import { useState } from 'react'
import { AuthProvider,useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AppShell from './components/layout/AppShell'
import SaleDrawer from './components/ui/SaleDrawer'
import Overview from './pages/Overview'
import Sales from './pages/Sales'
import Inventory from './pages/Inventory'
import Promotions from './pages/Promotions'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Account from './pages/Account'
import ClientHome from './pages/ClientHome'
import Products from './pages/Products'
import Household from './pages/Household'
const screens={Resumen:Overview,Productos:Products,Ventas:Sales,Inventario:Inventory,Promociones:Promotions,Clientes:Customers,Reportes:Reports,Configuración:Settings,'Mi hogar':Household,'Mi cuenta':Account}
function Dashboard(){const {user}=useAuth();const [page,setPage]=useState('Resumen');const [sale,setSale]=useState(false);const [salesRevision,setSalesRevision]=useState(0);const Screen=page==='Resumen'&&user.role==='client'?ClientHome:(screens[page]||Overview);function registerSale(){setSalesRevision(value=>value+1);setPage('Ventas')}return <AppShell page={page} setPage={setPage} onSale={()=>setSale(true)}><Screen openSale={()=>setSale(true)} onNavigate={setPage} revision={salesRevision}/>{sale&&user.role==='admin'&&<SaleDrawer onCreated={registerSale} close={()=>setSale(false)}/>}</AppShell>}
function Gate(){const {user}=useAuth();return user?<Dashboard key={`${user.id}:${user.role}`}/>:<Login/>}
export default function App(){return <AuthProvider><Gate/></AuthProvider>}

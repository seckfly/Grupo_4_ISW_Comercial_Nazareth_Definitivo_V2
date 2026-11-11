import { useEffect, useState } from 'react'
import { Search, ChevronRight, Phone, Users } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { api } from '../../services/api'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.customers(controller.signal).then(setCustomers).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [retry])
  const rows = customers.filter(customer => [customer.name, customer.email, customer.phone].join(' ').toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
  const initials = name => name.split(' ').map(word => word[0]).slice(0, 2).join('')
  return <div className="page">
    <PageHeader kicker="Personas que vuelven" title="Clientes frecuentes" description="Consulta los datos de los clientes registrados."/>
    {loading ? <Card><Skeleton/></Card> : error ? <Card><p className="form-error" role="alert">{error}</p><button className="secondary" onClick={() => setRetry(value => value + 1)}>Reintentar</button></Card> :
    !customers.length ? <Card><EmptyState icon={<Users/>} title="Aún no hay clientes registrados" copy="Los registros disponibles aparecerán aquí."/></Card> :
    <div className="customer-layout"><Card className="customer-directory">
      <label className="search"><Search/><input aria-label="Buscar cliente" placeholder="Buscar cliente" value={query} onChange={event => setQuery(event.target.value)}/></label>
      {rows.map(customer => <button key={customer.id} className={selected?.id === customer.id ? 'active' : ''} onClick={() => setSelected(customer)}>
        <span className="big-avatar">{initials(customer.name)}</span><div><strong>{customer.name}</strong><small>{customer.email}</small></div><ChevronRight/>
      </button>)}
      {!rows.length && <p>No hay coincidencias con la búsqueda.</p>}
    </Card><Card className="customer-profile">
      {selected ? <div className="profile-head"><span className="profile-avatar">{initials(selected.name)}</span><div><p className="eyebrow">Cliente registrado</p><h3>{selected.name}</h3><p>{selected.email}</p><span><Phone/> {selected.phone || 'Sin teléfono registrado'}</span></div></div> :
      <EmptyState icon={<Users/>} title="Selecciona un cliente" copy="Consulta su nombre y datos de contacto."/>}
    </Card></div>}
  </div>
}


import { useEffect, useState } from 'react'
import { Search, ChevronRight, Users } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { currency,countLabel } from '../../utils/format'
import { api } from '../../services/api'

function CustomerProfile({ customer, initials }) {
  return <>
    <header className="profile-head customer-profile-heading">
      <span className="profile-avatar" aria-hidden="true">{initials}</span>
      <h3>{customer.name}</h3>
    </header>
    <section className="customer-profile-section">
      <h4>Contacto</h4>
      <dl className="customer-contact">
        <div><dt>Correo electrónico</dt><dd>{customer.email || 'Sin correo registrado'}</dd></div>
        <div><dt>Teléfono</dt><dd>{customer.phone || 'Sin teléfono registrado'}</dd></div>
      </dl>
    </section>
    <section className="customer-profile-section">
      <h4>Resumen de compras</h4>
      <ul className="customer-stats">
        <li>{countLabel(customer.visits, 'compra', 'compras')}</li>
        <li>{currency(customer.spent)} en compras</li>
        <li>{countLabel(customer.points, 'punto', 'puntos')}</li>
      </ul>
    </section>
    <section className="customer-profile-section">
      <h4>Historial de compras</h4>
      {customer.purchases?.length ? <div className="table-wrap">
        <table aria-label="Historial de compras">
          <thead><tr><th scope="col">Venta</th><th scope="col">Fecha</th><th scope="col">Importe</th></tr></thead>
          <tbody>{customer.purchases.map(sale => <tr key={sale.id}>
            <th scope="row">#{sale.id}</th>
            <td><time dateTime={sale.createdAt}>{new Date(sale.createdAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</time></td>
            <td>{currency(sale.total)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p>Aún no hay compras registradas.</p>}
    </section>
  </>
}

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
        <span className="big-avatar">{initials(customer.name)}</span><div><strong>{customer.name}</strong><small>{customer.email || 'Sin correo registrado'}</small></div><ChevronRight/>
      </button>)}
      {!rows.length && <p>No hay coincidencias con la búsqueda.</p>}
    </Card><Card className="customer-profile">
      {selected ? <CustomerProfile customer={selected} initials={initials(selected.name)}/> :
      <EmptyState icon={<Users/>} title="Selecciona un cliente" copy="Consulta su nombre y datos de contacto."/>}
    </Card></div>}
  </div>
}


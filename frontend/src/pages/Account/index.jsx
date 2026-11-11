import PasswordForm from '../../components/ui/PasswordForm'
import { useEffect,useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
export default function Account() {
  const {user}=useAuth()
  const [customer,setCustomer]=useState(null),[error,setError]=useState('')
  useEffect(()=>{if(user.role!=='client')return;const controller=new AbortController();api.customerAccount(controller.signal).then(setCustomer).catch(error=>{if(!controller.signal.aborted)setError(error.message)});return()=>controller.abort()},[user.id,user.role])
  return <div className="page client-account"><PageHeader title="Mi cuenta" description="Datos de tu cuenta registrada"/>
  <div className="account-grid"><Card className="account-identity"><div className="account-monogram">{user.name.split(' ').map(word=>word[0]).slice(0,2).join('')}</div><h3>{user.name}</h3><span>{user.role==='admin'?'Administrador':'Cliente registrado'}</span>{user.role==='client'&&(error?<p role="alert">{error}</p>:customer?<div className="account-points"><strong>{customer.points}</strong><span>Puntos registrados</span></div>:<p>Cargando puntos…</p>)}</Card>
  <Card className="account-contact">
    <h3>Información de contacto</h3>
    <dl>
      <div>
        <dt>Nombre completo</dt>
        <dd>{user.name}</dd>
      </div>
      <div>
        <dt>Correo electrónico</dt>
        <dd>{user.email || 'Sin correo registrado'}</dd>
      </div>
    </dl>
  </Card></div><PasswordForm/></div>
}


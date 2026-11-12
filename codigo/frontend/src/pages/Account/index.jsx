import PasswordForm from '../../components/ui/PasswordForm'
import PhoneForm from '../../components/ui/PhoneForm'
import AccountRemoval from '../../components/ui/AccountRemoval'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import LoyaltyBenefits from './LoyaltyBenefits'

export default function Account() {
  const {user}=useAuth()
  const [customer,setCustomer]=useState(null),[error,setError]=useState('')
  useEffect(()=>{if(user.role!=='client')return;const controller=new AbortController();api.customerAccount(controller.signal).then(setCustomer).catch(error=>{if(!controller.signal.aborted)setError(error.message)});return()=>controller.abort()},[user.id,user.role])
  const [benefitError, setBenefitError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const claimId = useRef(null)

  async function changeBenefit(id) {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setBenefitError('')
    try {
      if (!id) claimId.current ??= crypto.randomUUID()
      setCustomer(id ? await api.cancelBenefit(id) : await api.claimBenefit(claimId.current))
      if (!id) claimId.current = null
      return true
    } catch (error) {
      setBenefitError(error.message)
      if (error.status === 409) {
        if (!id) claimId.current = null
        const latest = await api.customerAccount().catch(() => null)
        if (latest) setCustomer(latest)
      }
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return <div className="page client-account"><PageHeader title="Mi cuenta" description="Datos de tu cuenta registrada"/>
  <div className="account-grid"><Card className="account-identity"><div className="account-monogram">{user.name.split(' ').map(word=>word[0]).slice(0,2).join('')}</div><h3>{user.name}</h3><span>{user.role==='admin'?'Administrador':'Cliente registrado'}</span>{user.role==='client'&&(error?<p role="alert">{error}</p>:customer?<div className="account-points"><strong>{customer.points}</strong><span>Puntos disponibles</span></div>:<p>Cargando puntos…</p>)}</Card>
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
      {user.role === 'client' && <div>
        <dt>Teléfono</dt>
        <dd>{user.phone === undefined ? (customer?.phone?.trim() || 'Sin teléfono registrado') : (user.phone?.trim() || 'Sin teléfono registrado')}</dd>
      </div>}
    </dl>
  </Card></div>
  {customer?.reward && <LoyaltyBenefits account={customer} busy={busy} error={benefitError}
    onClaim={() => changeBenefit()} onCancel={changeBenefit}/>}
  <PhoneForm/>
  <PasswordForm/>
  <AccountRemoval/></div>
}


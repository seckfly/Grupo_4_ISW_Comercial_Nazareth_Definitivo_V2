import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
export default function Account() {
  const {user}=useAuth()
  return <div className="page client-account"><PageHeader title="Mi cuenta" description="Datos de tu cuenta registrada"/>
  <div className="account-grid"><Card className="account-identity"><div className="account-monogram">{user.name.split(' ').map(word=>word[0]).slice(0,2).join('')}</div><h3>{user.name}</h3><span>Cliente registrado</span></Card>
  <Card><h3>Información de contacto</h3><div className="account-form"><label>Nombre completo<input value={user.name} readOnly/></label><label>Correo electrónico<input value={user.email || ''} readOnly/></label></div><p>La edición de datos personales aún no está disponible.</p></Card></div></div>
}


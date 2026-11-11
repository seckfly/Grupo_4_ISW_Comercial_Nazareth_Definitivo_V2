import { useId, useState } from 'react'
import PasswordVisibilityControl from './PasswordVisibilityControl'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../services/supabase'
import { changeOwnPassword } from '../../services/password'
import { Card } from './Card'
const fields = [
  { name: 'current', label: 'Contraseña actual', subject: 'la contraseña actual', autoComplete: 'current-password' },
  { name: 'password', label: 'Nueva contraseña', subject: 'la nueva contraseña', autoComplete: 'new-password', minLength: 8 },
  { name: 'confirmation', label: 'Confirmar nueva contraseña', subject: 'la confirmación de contraseña', autoComplete: 'new-password', minLength: 8 },
]

export default function PasswordForm() {
  const formId = useId()
  const [visible, setVisible] = useState({})
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  async function submit(event) {
    event.preventDefault();if(busy)return
    const form=event.currentTarget,data=new FormData(form)
    setBusy(true);setError('');setNotice('')
    try {
      if(!supabase)throw new Error('Supabase Auth aún no está configurado.')
      await changeOwnPassword({client:supabase,makeVerifier:()=>createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),currentPassword:data.get('current'),password:data.get('password'),confirmation:data.get('confirmation')})
      form.reset();setVisible({});setNotice('Contraseña actualizada. Tu sesión se renovó con la nueva contraseña.')
    }catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <Card><h3>Cambiar mi contraseña</h3><form className="account-form" onSubmit={submit} aria-busy={busy}>
    {fields.map(({ label, subject, ...field }) => {
      const id = formId + '-' + field.name
      const shown = Boolean(visible[field.name])
      return <div className="own-password-field" key={field.name}>
        <label htmlFor={id}>{label}</label>
        <PasswordVisibilityControl id={id} shown={shown} subject={subject} disabled={busy}
          onToggle={() => setVisible(current => ({ ...current, [field.name]: !current[field.name] }))}>
          <input {...field} id={id} type={shown ? 'text' : 'password'} required disabled={busy}/>
        </PasswordVisibilityControl>
      </div>
    })}
    {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="form-success" role="status">{notice}</p>}
    <button className="primary" disabled={busy}>{busy?'Actualizando…':'Cambiar contraseña'}</button>
  </form></Card>
}

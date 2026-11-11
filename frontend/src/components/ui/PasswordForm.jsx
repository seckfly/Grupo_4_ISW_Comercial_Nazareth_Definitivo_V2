import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../services/supabase'
import { changeOwnPassword } from '../../services/password'
import { Card } from './Card'
export default function PasswordForm() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  async function submit(event) {
    event.preventDefault();if(busy)return
    const form=event.currentTarget,data=new FormData(form)
    setBusy(true);setError('');setNotice('')
    try {
      if(!supabase)throw new Error('Supabase Auth aún no está configurado.')
      await changeOwnPassword({client:supabase,makeVerifier:()=>createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),currentPassword:data.get('current'),password:data.get('password'),confirmation:data.get('confirmation')})
      form.reset();setNotice('Contraseña actualizada. Tu sesión se renovó con la nueva contraseña.')
    }catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <Card><h3>Cambiar mi contraseña</h3><form className="account-form" onSubmit={submit} aria-busy={busy}>
    <label>Contraseña actual<input type="password" name="current" autoComplete="current-password" required disabled={busy}/></label>
    <label>Nueva contraseña<input type="password" name="password" autoComplete="new-password" minLength={8} required disabled={busy}/></label>
    <label>Confirmar nueva contraseña<input type="password" name="confirmation" autoComplete="new-password" minLength={8} required disabled={busy}/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="form-success" role="status">{notice}</p>}
    <button className="primary" disabled={busy}>{busy?'Actualizando…':'Cambiar contraseña'}</button>
  </form></Card>
}

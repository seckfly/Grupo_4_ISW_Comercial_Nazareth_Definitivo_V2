export async function changeOwnPassword({client,makeVerifier,currentPassword,password,confirmation}) {
  if(!currentPassword||typeof password!=='string'||password.length<8)throw new Error('Completa la contraseña actual y una nueva de al menos 8 caracteres.')
  if(password!==confirmation)throw new Error('Las contraseñas nuevas no coinciden.')
  if(currentPassword===password)throw new Error('La nueva contraseña debe ser distinta de la actual.')
  const {data,error}=await client.auth.getUser()
  if(error||!data?.user?.email)throw new Error('Vuelve a iniciar sesión antes de cambiar la contraseña.')
  const verifier=makeVerifier()
  try {
    const result=await verifier.auth.signInWithPassword({email:data.user.email,password:currentPassword})
    if(result.error||result.data?.user?.id!==data.user.id)throw new Error('La contraseña actual no coincide o no se pudo reautenticar la cuenta.')
    const changed=await verifier.auth.updateUser({password,current_password:currentPassword})
    if(changed.error)throw new Error('Supabase rechazó el cambio. Comprueba la política de contraseñas y vuelve a autenticarte.')
    const signedIn=await client.auth.signInWithPassword({email:data.user.email,password})
    if(signedIn.error)throw new Error('Contraseña actualizada. Inicia sesión de nuevo con la nueva contraseña.')
    return true
  } finally {await verifier.auth.signOut({scope:'local'}).catch(()=>{})}
}

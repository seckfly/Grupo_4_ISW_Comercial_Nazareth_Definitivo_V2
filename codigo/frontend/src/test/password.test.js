import { describe,it,expect,vi } from 'vitest'
import { changeOwnPassword } from '../services/password'
describe('Cambio propio de contraseña',()=>{
  const fixture=()=>{
    const client={auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:'own',email:'qa@example.test'}}}),signInWithPassword:vi.fn().mockResolvedValue({error:null})}}
    const verifier={auth:{signInWithPassword:vi.fn().mockResolvedValue({data:{user:{id:'own'}},error:null}),updateUser:vi.fn().mockResolvedValue({error:null}),signOut:vi.fn().mockResolvedValue({})}}
    return {client,verifier,input:{client,makeVerifier:()=>verifier,currentPassword:'Anterior!123',password:'Nueva!456789',confirmation:'Nueva!456789'}}
  }
  it('reautentica, confirma, actualiza y comprueba el acceso posterior',async()=>{
    const {client,verifier,input}=fixture()
    await changeOwnPassword(input)
    expect(verifier.auth.signInWithPassword).toHaveBeenCalledWith({email:'qa@example.test',password:'Anterior!123'})
    expect(verifier.auth.updateUser).toHaveBeenCalledWith({password:'Nueva!456789',current_password:'Anterior!123'})
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({email:'qa@example.test',password:'Nueva!456789'})
    expect(verifier.auth.signOut).toHaveBeenCalledWith({scope:'local'})
  })
  it('rechaza confirmación distinta y no modifica Auth',async()=>{
    const {input,verifier}=fixture()
    await expect(changeOwnPassword({...input,confirmation:'Distinta!789'})).rejects.toThrow('no coinciden')
    expect(verifier.auth.updateUser).not.toHaveBeenCalled()
  })
  it('rechaza contraseña actual incorrecta sin actualizar',async()=>{
    const {input,verifier}=fixture();verifier.auth.signInWithPassword.mockResolvedValue({error:{code:'invalid_credentials'}})
    await expect(changeOwnPassword(input)).rejects.toThrow('actual no coincide')
    expect(verifier.auth.updateUser).not.toHaveBeenCalled()
  })
})

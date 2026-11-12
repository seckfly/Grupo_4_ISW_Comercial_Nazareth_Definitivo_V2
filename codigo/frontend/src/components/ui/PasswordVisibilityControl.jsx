import { Eye, EyeOff } from 'lucide-react'

export default function PasswordVisibilityControl({ id, shown, onToggle, subject, disabled, children }) {
  return <div className="own-password-control">
    {children}
    <button type="button" disabled={disabled} aria-controls={id}
      aria-label={(shown ? 'Ocultar ' : 'Mostrar ') + subject} onClick={onToggle}>
      {shown ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}
    </button>
  </div>
}

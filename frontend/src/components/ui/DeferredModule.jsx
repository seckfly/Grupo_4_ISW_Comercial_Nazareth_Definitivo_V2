import { Component, Suspense, lazy, useState } from 'react'
import { Skeleton } from './States'

// Definitions are created once, outside render. Each mount retries only its own failed import.
export const deferredModule = load => ({ load, Component: lazy(load) })

export function reloadApplication(confirm = message => window.confirm(message), reload = () => window.location.reload()) {
  if (confirm('Recargar puede perder los cambios sin guardar. ¿Quieres recargar la aplicación?')) reload()
}

class ModuleErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default function DeferredModule({ definition, label, componentProps = {}, fallback, errorFrame = content => content }) {
  const [retries, setRetries] = useState(() => new Map())
  const Screen = retries.get(definition) || definition.Component
  const retry = () => setRetries(previous => new Map(previous).set(definition, lazy(definition.load)))
  const failure = <section role="alert">
    <p className="form-error">No se pudo cargar {label}. Comprueba la conexión y vuelve a intentarlo.</p>
    <div className="toolbar">
      <button type="button" className="secondary" onClick={retry}>Reintentar carga</button>
      <button type="button" className="text-btn" onClick={() => reloadApplication()}>Recargar aplicación</button>
    </div>
    <p>También puedes abrir otro módulo. La recarga puede perder cambios sin guardar.</p>
  </section>
  return <ModuleErrorBoundary resetKey={Screen} fallback={errorFrame(failure)}>
    <Suspense fallback={fallback ?? <div role="status" aria-label={'Cargando ' + label}><Skeleton/></div>}>
      <Screen {...componentProps}/>
    </Suspense>
  </ModuleErrorBoundary>
}

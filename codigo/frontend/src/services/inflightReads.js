// Session-owned, pending reads only. Completed results are never cached.
export function createInflightReads() {
  const pending = new Map()
  const abortError = () => new DOMException('Read cancelled', 'AbortError')
  let owners = 0
  function cancel(entry) {
    if (pending.get(entry.key) === entry) pending.delete(entry.key)
    entry.controller.abort()
    for (const subscriber of [...entry.subscribers]) subscriber.finish(false, abortError())
  }
  return {
    retain() {
      owners += 1
      return () => {
        owners -= 1
        // React effect handoffs (including StrictMode) may immediately reattach.
        queueMicrotask(() => { if (!owners) for (const entry of pending.values()) cancel(entry) })
      }
    },
    read(key, load, signal) {
      if (signal?.aborted) return Promise.reject(abortError())
      let entry = pending.get(key)
      if (!entry) {
        entry = { key, controller: new AbortController(), subscribers: new Set() }
        pending.set(key, entry)
        const finish = (success, value) => {
          if (pending.get(key) === entry) pending.delete(key)
          for (const subscriber of [...entry.subscribers]) subscriber.finish(success, value)
        }
        Promise.resolve().then(() => {
          entry.controller.signal.throwIfAborted()
          return load(entry.controller.signal)
        }).then(value => finish(true, value), error => finish(false, error))
      }
      return new Promise((resolve, reject) => {
        const subscriber = {
          finish(success, value) {
            signal?.removeEventListener('abort', abort)
            entry.subscribers.delete(subscriber)
            if (success) resolve(value)
            else reject(value)
          },
        }
        function abort() {
          subscriber.finish(false, abortError())
          queueMicrotask(() => { if (!entry.subscribers.size) cancel(entry) })
        }
        entry.subscribers.add(subscriber)
        signal?.addEventListener('abort', abort, { once: true })
      })
    },
  }
}

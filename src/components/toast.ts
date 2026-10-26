export interface Toast {
  id: number
  kind: 'success' | 'error' | 'info'
  title: string
  body?: string
}

let toasts: Toast[] = []
const listeners = new Set<(t: Toast[]) => void>()
let nextId = 1

function emit() {
  for (const l of listeners) l([...toasts])
}

export function pushToast(kind: Toast['kind'], title: string, body?: string): void {
  const t: Toast = { id: nextId++, kind, title, body }
  toasts = [...toasts, t]
  emit()
  setTimeout(() => dismissToast(t.id), kind === 'error' ? 9000 : 4500)
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(fn: (t: Toast[]) => void): () => void {
  listeners.add(fn)
  fn([...toasts])
  return () => {
    listeners.delete(fn)
  }
}

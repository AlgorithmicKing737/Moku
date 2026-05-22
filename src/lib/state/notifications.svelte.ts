export type ToastKind = 'info' | 'success' | 'error' | 'download'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  detail?: string
  duration?: number
}

export const notificationsState = $state({
  toasts: [] as Toast[],
})

export function toast(kind: ToastKind, message: string, detail?: string, duration = 4000) {
  const id = crypto.randomUUID()
  notificationsState.toasts.push({ id, kind, message, detail, duration })
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }
}

export function dismissToast(id: string) {
  notificationsState.toasts = notificationsState.toasts.filter(t => t.id !== id)
}

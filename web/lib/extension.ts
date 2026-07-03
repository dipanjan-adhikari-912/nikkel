export const PING = 'NIKKEL_PING'
export const PONG = 'NIKKEL_AVAILABLE'
export const OPEN_PROJECT = 'OPEN_PROJECT'
export const OPEN_PROJECT_RESULT = 'OPEN_PROJECT_RESULT'
export const PING_TIMEOUT = 500
export const OPEN_PROJECT_TIMEOUT = 10000

export interface ExtensionMessage {
  type: string
  payload?: Record<string, unknown>
}

export interface OpenProjectResult {
  ok: boolean
  error?: string
  targetUrl?: string
}

function sendMessage(msg: ExtensionMessage): void {
  window.postMessage(msg, '*')
}

export function isExtensionInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve(false)
    }, PING_TIMEOUT)

    function handler(event: MessageEvent) {
      if (event.data?.type === PONG && event.data?.source === 'nikkel-extension') {
        cleanup()
        resolve(true)
      }
    }

    function cleanup() {
      clearTimeout(timer)
      window.removeEventListener('message', handler)
    }

    window.addEventListener('message', handler)
    sendMessage({ type: PING })
  })
}

export function openProject(shareId: string): Promise<OpenProjectResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve({ ok: false, error: 'Extension did not respond' })
    }, OPEN_PROJECT_TIMEOUT)

    function handler(event: MessageEvent) {
      if (event.data?.type === OPEN_PROJECT_RESULT) {
        cleanup()
        resolve(event.data.payload || { ok: false, error: 'Malformed response' })
      }
    }

    function cleanup() {
      clearTimeout(timer)
      window.removeEventListener('message', handler)
    }

    window.addEventListener('message', handler)
    sendMessage({ type: OPEN_PROJECT, payload: { shareId } })
  })
}
